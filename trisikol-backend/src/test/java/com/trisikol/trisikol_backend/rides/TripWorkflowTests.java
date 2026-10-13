package com.trisikol.trisikol_backend.rides;

import com.trisikol.trisikol_backend.auth.*;
import com.trisikol.trisikol_backend.fare.*;
import java.math.BigDecimal;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.*;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {"spring.datasource.url=jdbc:h2:mem:trip-tests;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
                  "trisikol.dispatch.require-location=false"})
@Import(TripWorkflowTests.RoutingStub.class)
class TripWorkflowTests {
    @TestConfiguration static class RoutingStub {
        @Bean @Primary RoadRouting fakeRouting() { return (from, to) -> {
            if (to.lat() == 0) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Routing unavailable.");
            return new RoadRouting.Route(new BigDecimal("3.501"),
                    List.of(List.of(from.lat(), from.lng()), List.of(to.lat(), to.lng())));
        }; }
    }
    @Value("${local.server.port}") int port;
    @Autowired AccountService accounts;
    @Autowired TripService trips;
    @Autowired QuoteService prices;
    @Autowired RideRepository rides;
    @Autowired CashRepository cash;
    @Autowired FarePolicyRepository policies;
    @Autowired org.springframework.transaction.support.TransactionTemplate transactions;
    final JsonMapper json = JsonMapper.builder().build();
    static final String PASSWORD = "Trip-tests-only-password!";
    static int mobileCounter = 100;

    record Session(Account account, Browser browser) {}
    class Browser {
        final HttpClient client = HttpClient.newBuilder().cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL)).build();
        HttpResponse<String> send(String method, String path, String body, boolean csrf) throws Exception {
            var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api" + path)).timeout(Duration.ofSeconds(15));
            if (csrf) {
                var token = json.readTree(send("GET", "/auth/csrf", null, false).body());
                request.header(token.get("headerName").asText(), token.get("token").asText());
            }
            if (body != null) request.header("Content-Type", path.equals("/auth/login") ? "application/x-www-form-urlencoded" : "application/json");
            return client.send(request.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
        }
        JsonNode get(String path) throws Exception {
            var response = send("GET", path, null, false); assertEquals(200, response.statusCode(), response.body()); return json.readTree(response.body());
        }
        JsonNode post(String path, Object body, int expected) throws Exception {
            var response = send("POST", path, json.writeValueAsString(body), true);
            assertEquals(expected, response.statusCode(), response.body()); return json.readTree(response.body());
        }
    }
    Session session(Account.Role role) throws Exception {
        var account = accounts.create("Trip Test " + role, String.format("0917%07d", mobileCounter++), PASSWORD, role);
        var browser = new Browser();
        assertEquals(204, browser.send("POST", "/auth/login", "mobile=" + account.getMobile()
                + "&password=" + URLEncoder.encode(PASSWORD, StandardCharsets.UTF_8), true).statusCode());
        if (role == Account.Role.DRIVER) trips.updateDriver(account.getId(),
                new TripService.VehicleInput(true, "TEST-" + account.getId(), "TEST-" + account.getId(), "Test tricycle"));
        return new Session(account, browser);
    }
    Map<String, Object> input(String category) {
        return Map.of("pickup", Map.of("lat", 15.21608, "lng", 120.549433),
                "dropoff", Map.of("lat", 15.22, "lng", 120.56), "category", category,
                "pickupLabel", "Test pickup", "dropoffLabel", "Test drop-off");
    }
    JsonNode quote(Session owner, boolean walk, String category) throws Exception {
        return owner.browser.post(walk ? "/driver/walk-in-quotes" : "/passenger/quotes", input(category), 201);
    }
    JsonNode book(Session owner, JsonNode quote, boolean walk) throws Exception {
        return owner.browser.post(walk ? "/driver/walk-ins" : "/passenger/rides", Map.of("quoteId", quote.get("quoteId").asText()), 201);
    }
    JsonNode action(Session owner, long id, String action) throws Exception {
        return owner.browser.post("/" + owner.account.getRole().name().toLowerCase() + "/rides/" + id + "/" + action, Map.of(), 200);
    }
    @BeforeEach void resetDispatch() {
        // Isolated test database only; preserve existing application tests and real data.
        transactions.executeWithoutResult(status -> {
            for (var ride : rides.findByStatusInOrderByIdAsc(TripService.ACTIVE)) { ride.status = "CANCELLED"; rides.save(ride); }
        });
        // Drivers leave explicitly through the workflow below; delete only this test queue.
        cleanupQueue();
        policies.saveAndFlush(new FarePolicy(new BigDecimal("40.00"), new BigDecimal("1.500"),
                new BigDecimal("10.00"), new BigDecimal("1.00"), "Test baseline policy", "TEST"));
    }
    @Autowired QueueRepository queue;
    void cleanupQueue() { queue.deleteAll(); }

    @Test void appFlowUsesRoadQuoteAndRecordsCashExactlyOnce() throws Exception {
        var passenger = session(Account.Role.PASSENGER); var driver = session(Account.Role.DRIVER);
        driver.browser.post("/driver/queue/join", Map.of(), 200);
        var quote = quote(passenger, false, "STUDENT");
        assertEquals(70, quote.get("rawFare").asInt()); // ceil(3.501 - 1.5) = 3 extra km
        assertEquals(14, quote.get("discountAmount").asInt());
        assertEquals(4, quote.get("serviceFee").asInt());
        assertEquals(60, quote.get("totalFare").asInt());
        var ride = book(passenger, quote, false); long id = ride.get("id").asLong();
        assertEquals("OFFERED", ride.get("status").asText());
        assertEquals(driver.account.getId().longValue(), ride.get("driver").get("id").asLong());
        assertEquals(id, book(passenger, quote, false).get("id").asLong());
        action(driver, id, "accept"); action(driver, id, "start");
        long before = cash.count();
        action(driver, id, "complete"); action(driver, id, "complete");
        assertEquals(before + 1, cash.count());
        var state = driver.browser.get("/driver/state");
        assertEquals(60, state.get("cashCollected").asInt());
        assertEquals(56, state.get("netEarnings").asInt());
        assertEquals(4, state.get("platformDue").asInt());
        assertTrue(state.get("position").isNull());
        assertEquals("COMPLETED", passenger.browser.get("/passenger/rides").get(0).get("status").asText());
    }
    @Test void walkInUsesQueueHeadAndHasNoPlatformFee() throws Exception {
        var first = session(Account.Role.DRIVER); var second = session(Account.Role.DRIVER);
        first.browser.post("/driver/queue/join", Map.of(), 200); second.browser.post("/driver/queue/join", Map.of(), 200);
        var quote = quote(second, true, "REGULAR");
        second.browser.post("/driver/walk-ins", Map.of("quoteId", quote.get("quoteId").asText()), 409);
        var walkQuote = quote(first, true, "REGULAR"); assertEquals(0, walkQuote.get("serviceFee").asInt());
        var ride = book(first, walkQuote, true); long id = ride.get("id").asLong();
        assertTrue(ride.get("passenger").isNull()); assertEquals("ACCEPTED", ride.get("status").asText());
        action(first, id, "start"); action(first, id, "complete");
        assertEquals(0, first.browser.get("/driver/state").get("platformDue").asInt());
    }
    @Test void competingBookingsCannotReserveTheSameDriver() throws Exception {
        var driver = session(Account.Role.DRIVER); var a = session(Account.Role.PASSENGER); var b = session(Account.Role.PASSENGER);
        driver.browser.post("/driver/queue/join", Map.of(), 200);
        var qa = quote(a, false, "REGULAR"); var qb = quote(b, false, "REGULAR");
        var executor = Executors.newFixedThreadPool(2);
        try {
            var one = executor.submit(() -> book(a, qa, false)); var two = executor.submit(() -> book(b, qb, false));
            var r1 = one.get(20, TimeUnit.SECONDS); var r2 = two.get(20, TimeUnit.SECONDS);
            assertEquals(Set.of("REQUESTED", "OFFERED"), Set.of(r1.get("status").asText(), r2.get("status").asText()));
            assertEquals(1, rides.findByStatusInOrderByIdAsc(TripService.ACTIVE).stream().filter(r -> driver.account.getId().equals(r.driverId)).count());
        } finally { executor.shutdownNow(); }
    }
    @Test void ownershipAndInvalidTransitionsAreEnforced() throws Exception {
        var p = session(Account.Role.PASSENGER); var stranger = session(Account.Role.PASSENGER);
        var driver = session(Account.Role.DRIVER); var otherDriver = session(Account.Role.DRIVER);
        var quote = quote(p, false, "REGULAR");
        stranger.browser.post("/passenger/rides", Map.of("quoteId", quote.get("quoteId").asText()), 404);
        driver.browser.post("/driver/queue/join", Map.of(), 200);
        var ride = book(p, quote, false); long id = ride.get("id").asLong();
        otherDriver.browser.post("/driver/rides/" + id + "/accept", Map.of(), 404);
        p.browser.post("/passenger/rides/" + id + "/complete", Map.of(), 403);
        driver.browser.post("/driver/rides/" + id + "/complete", Map.of(), 409);
        driver.browser.post("/driver/queue/join", Map.of(), 409);
        driver.browser.post("/driver/rides/" + id + "/accept", Map.of(), 200);
        action(p, id, "cancel");
        driver.browser.post("/driver/rides/" + id + "/start", Map.of(), 409);
        p.browser.post("/passenger/rides", Map.of("quoteId", quote(p, false, "REGULAR").get("quoteId").asText()), 201);
    }
    @Test void expiredOfferMovesToNextQueuedDriver() throws Exception {
        var first = session(Account.Role.DRIVER); var next = session(Account.Role.DRIVER); var p = session(Account.Role.PASSENGER);
        first.browser.post("/driver/queue/join", Map.of(), 200); next.browser.post("/driver/queue/join", Map.of(), 200);
        long id = book(p, quote(p, false, "REGULAR"), false).get("id").asLong();
        transactions.executeWithoutResult(status -> { var ride = rides.findById(id).orElseThrow(); ride.offerExpiresAt = Instant.now().minusSeconds(1); rides.save(ride); });
        var current = p.browser.get("/passenger/rides").get(0);
        assertEquals(next.account.getId().longValue(), current.get("driver").get("id").asLong());
        first.browser.post("/driver/rides/" + id + "/accept", Map.of(), 404);
    }
    @Test void unavailableRoutingCannotCreateQuoteAndPriceSnapshotSurvivesPolicyChange() throws Exception {
        var p = session(Account.Role.PASSENGER);
        var invalid = new HashMap<>(input("REGULAR")); invalid.put("dropoff", Map.of("lat", 0, "lng", 1));
        p.browser.post("/passenger/quotes", invalid, 503);
        var quote = quote(p, false, "REGULAR");
        policies.saveAndFlush(new FarePolicy(new BigDecimal("99"), new BigDecimal("1.5"), new BigDecimal("10"),
                new BigDecimal("1"), "Test policy update", "TEST"));
        assertEquals(74, book(p, quote, false).get("fare").get("totalFare").asInt());
    }
}
