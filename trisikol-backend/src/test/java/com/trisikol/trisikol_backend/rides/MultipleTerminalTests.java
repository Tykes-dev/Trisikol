package com.trisikol.trisikol_backend.rides;

import com.trisikol.trisikol_backend.auth.*;
import com.trisikol.trisikol_backend.fare.*;
import com.trisikol.test.TestApi;
import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.*;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:multi-tests;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "trisikol.dispatch.require-location=false"})
@Import(TripWorkflowTests.RoutingStub.class)
class MultipleTerminalTests {
    @Value("${local.server.port}") int port;
    @Autowired AccountService accounts;
    @Autowired TripService trips;
    @Autowired RideRepository rides;
    @Autowired QueueRepository queue;
    @Autowired FarePolicyRepository policies;
    @Autowired QuoteRepository quotes;
    @Autowired TransactionTemplate transactions;
    static int next = 2000;
    TestApi.Session session(Account.Role role) throws Exception { return TestApi.create(accounts, port, role, String.format("0917%07d", next++)); }
    @BeforeEach void cleanup() {
        transactions.executeWithoutResult(status -> { for (var ride : rides.findByStatusInOrderByIdAsc(TripService.ACTIVE)) { ride.status = "CANCELLED"; rides.save(ride); } });
        queue.deleteAll();
        policies.saveAndFlush(new FarePolicy(new BigDecimal("40"), new BigDecimal("1.5"), new BigDecimal("10"), new BigDecimal("1"), "Isolated baseline", "TEST"));
    }
    long terminal(TestApi api) throws Exception {
        return api.request("POST", "/admin/terminals", Map.of("name", "Isolated TODA " + next++, "latitude", 15.2155, "longitude", 120.5487), 201).get("id").asLong();
    }
    void assign(TestApi api, TestApi.Session driver, long terminalId, int expected) throws Exception {
        api.request("PUT", "/admin/drivers/" + driver.account().getId() + "/vehicle", Map.of("enabled", true,
                "bodyNumber", "TEST", "plateNumber", "TEST", "vehicleModel", "Test tricycle", "terminalId", terminalId), expected);
    }
    @Test void queuesAndDispatchAreIsolatedAndReassignmentIsBlockedWhenBusy() throws Exception {
        var admin = session(Account.Role.ADMIN); var p = session(Account.Role.PASSENGER);
        var first = session(Account.Role.DRIVER); var second = session(Account.Role.DRIVER);
        long other = terminal(admin.api()); assign(admin.api(), first, 1, 200); assign(admin.api(), second, other, 200);
        first.api().request("POST", "/driver/queue/join", Map.of(), 200);
        second.api().request("POST", "/driver/queue/join", Map.of(), 200);
        assertEquals(1, first.api().get("/driver/state").get("position").asInt());
        assertEquals(1, second.api().get("/driver/state").get("position").asInt());
        assertEquals(1, admin.api().get("/admin/queue?terminalId=" + other).size());
        assign(admin.api(), second, 1, 409);
        var quote = p.api().request("POST", "/passenger/quotes", TestApi.quoteInput(other), 201);
        var ride = p.api().request("POST", "/passenger/rides", Map.of("quoteId", quote.get("quoteId").asText()), 201);
        assertEquals(second.account().getId().longValue(), ride.get("driver").get("id").asLong());
        // Merge regression: terminal-scoped dispatch must still record recipient-private notifications.
        assertEquals(2, p.api().get("/notifications").get("unreadCount").asInt());
        assertEquals("New ride offer", second.api().get("/notifications").get("items").get(0).get("title").asText());
        assertEquals(0, first.api().get("/notifications").get("unreadCount").asInt());
        assertEquals(1, first.api().get("/driver/state").get("position").asInt());
        assign(admin.api(), second, 1, 409);
        p.api().request("POST", "/passenger/rides/" + ride.get("id").asLong() + "/cancel", Map.of(), 200);
        assign(admin.api(), second, 1, 200);
    }
    @Test void scopedFareRevisionPreservesOtherTodsAndOldQuotes() throws Exception {
        var admin = session(Account.Role.ADMIN); var p = session(Account.Role.PASSENGER); long other = terminal(admin.api());
        var old = p.api().request("POST", "/passenger/quotes", TestApi.quoteInput(other), 201);
        admin.api().request("POST", "/admin/fare-policies", Map.of("terminalId", other, "baseFare", 90, "baseDistanceKm", 1.5,
                "extraFarePerKm", 10, "appServiceFeePerKm", 1, "changeReason", "Isolated TODA pricing test"), 201);
        assertEquals(40, p.api().get("/fares/current?terminalId=1").get("baseFare").asInt());
        assertEquals(90, p.api().get("/fares/current?terminalId=" + other).get("baseFare").asInt());
        var updated = p.api().request("POST", "/passenger/quotes", TestApi.quoteInput(other), 201);
        assertEquals(124, updated.get("totalFare").asInt());
        var ride = p.api().request("POST", "/passenger/rides", Map.of("quoteId", old.get("quoteId").asText()), 201);
        assertEquals(74, ride.get("fare").get("totalFare").asInt());
        assertEquals(other, ride.get("fare").get("terminalId").asLong());
        for (var policy : admin.api().get("/admin/fare-policies?terminalId=" + other)) assertEquals(other, policy.get("terminalId").asLong());
    }
    @Test void terminalAdministrationAndWalkInsEnforceAssignmentAndCsrf() throws Exception {
        var admin = session(Account.Role.ADMIN); var p = session(Account.Role.PASSENGER); var driver = session(Account.Role.DRIVER);
        long other = terminal(admin.api()); long unused = terminal(admin.api()); assign(admin.api(), driver, other, 200);
        assertEquals(other, driver.api().get("/terminals/current").get("id").asLong());
        assertEquals(401, new TestApi(port).send("GET", "/terminals", null, false).statusCode());
        p.api().request("POST", "/admin/terminals", Map.of(), 403);
        assertEquals(403, admin.api().send("POST", "/admin/terminals", "{}", false).statusCode());
        admin.api().request("POST", "/admin/terminals", Map.of("name", "Bad", "latitude", 91, "longitude", 0), 400);
        String name = driver.api().get("/terminals/current").get("name").asText();
        admin.api().request("POST", "/admin/terminals", Map.of("name", name, "latitude", 0, "longitude", 0), 409);
        p.api().request("POST", "/passenger/quotes", TestApi.quoteInput(999999), 404);
        driver.api().request("POST", "/driver/walk-in-quotes", TestApi.quoteInput(1), 400);
        var stale = driver.api().request("POST", "/driver/walk-in-quotes", TestApi.quoteInput(other), 201);
        assign(admin.api(), driver, unused, 200); driver.api().request("POST", "/driver/queue/join", Map.of(), 200);
        driver.api().request("POST", "/driver/walk-ins", Map.of("quoteId", stale.get("quoteId").asText()), 409);
        admin.api().request("PUT", "/admin/terminals/" + other, Map.of("name", name, "latitude", 15.2155, "longitude", 120.5487), 200);
        admin.api().request("PUT", "/admin/terminals/" + unused, Map.of("name", "Blocked", "latitude", 15.2155, "longitude", 120.5487), 409);
        var walk = driver.api().request("POST", "/driver/walk-in-quotes", TestApi.quoteInput(unused), 201);
        assertEquals(0, walk.get("serviceFee").asInt());
        assertEquals("ACCEPTED", driver.api().request("POST", "/driver/walk-ins", Map.of("quoteId", walk.get("quoteId").asText()), 201).get("status").asText());
    }
    @Test void nearbySuggestionsRankPersistedTerminalsWithoutCreatingQuotesOrChangingQueues() throws Exception {
        var admin = session(Account.Role.ADMIN); var passenger = session(Account.Role.PASSENGER);
        long far = admin.api().request("POST", "/admin/terminals", Map.of("name", "Far discovery " + next++, "latitude", 0, "longitude", 0), 201).get("id").asLong();
        long near = admin.api().request("POST", "/admin/terminals", Map.of("name", "Near discovery " + next++, "latitude", 15.22, "longitude", 120.56), 201).get("id").asLong();
        long tied = admin.api().request("POST", "/admin/terminals", Map.of("name", "Tied discovery " + next++, "latitude", 15.22, "longitude", 120.56), 201).get("id").asLong();
        long quoteCount = quotes.count(), queueCount = queue.count();
        var result = passenger.api().request("POST", "/passenger/terminal-suggestions", Map.of("pickup", Map.of("lat", 15.22, "lng", 120.56)), 200);
        assertEquals("STRAIGHT_LINE", result.get("distanceBasis").asText());
        assertFalse(result.get("coverageVerified").asBoolean());
        var suggestions = result.get("terminals");
        assertEquals(near, suggestions.get(0).get("id").asLong());
        assertEquals(tied, suggestions.get(1).get("id").asLong());
        assertEquals(0d, suggestions.get(0).get("straightLineDistanceKm").asDouble());
        double previous = -1;
        for (var item : suggestions) {
            assertTrue(item.get("straightLineDistanceKm").asDouble() >= previous);
            previous = item.get("straightLineDistanceKm").asDouble();
            assertFalse(item.has("drivers")); assertFalse(item.has("passengers"));
        }
        assertEquals(far, suggestions.get(suggestions.size() - 1).get("id").asLong());
        assertEquals(quoteCount, quotes.count()); assertEquals(queueCount, queue.count());
        assertEquals(near, passenger.api().request("POST", "/passenger/quotes", TestApi.quoteInput(near), 201).get("terminalId").asLong());
    }
    @Test void terminalSuggestionsRequirePassengerCsrfAndValidCoordinates() throws Exception {
        String path = "/passenger/terminal-suggestions";
        var input = Map.of("pickup", Map.of("lat", 15.22, "lng", 120.56));
        new TestApi(port).request("POST", path, input, 401);
        session(Account.Role.DRIVER).api().request("POST", path, input, 403);
        session(Account.Role.ADMIN).api().request("POST", path, input, 403);
        var passenger = session(Account.Role.PASSENGER);
        assertEquals(403, passenger.api().send("POST", path, "{\"pickup\":{\"lat\":15.22,\"lng\":120.56}}", false).statusCode());
        passenger.api().request("POST", path, Map.of(), 400);
        passenger.api().request("POST", path, Map.of("pickup", Map.of("lat", 15.22)), 400);
        passenger.api().request("POST", path, Map.of("pickup", Map.of("lat", 91, "lng", 0)), 400);
        passenger.api().request("POST", path, Map.of("pickup", Map.of("lat", 0, "lng", -181)), 400);
        passenger.api().request("POST", path, Map.of("pickup", Map.of("lat", "invalid", "lng", 0)), 400);
        var result = passenger.api().request("POST", path, Map.of("pickup", Map.of("lat", 0, "lng", 0)), 200);
        assertEquals("STRAIGHT_LINE", result.get("distanceBasis").asText());
    }
}
