package com.trisikol.trisikol_backend.rides;

import com.trisikol.test.TestApi;
import com.trisikol.trisikol_backend.auth.*;
import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:receipt-tests;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "trisikol.dispatch.require-location=false"})
@Import(TripWorkflowTests.RoutingStub.class)
class TripReceiptTests {
    @Value("${local.server.port}") int port;
    @Autowired AccountService accounts;
    @Autowired TripService trips;
    @Autowired RideRepository rides;
    @Autowired CashRepository cash;
    @Autowired QueueRepository queue;
    @Autowired com.trisikol.trisikol_backend.fare.FarePolicyRepository policies;
    @Autowired TransactionTemplate transactions;
    static int next = 5000;
    TestApi.Session session(Account.Role role) throws Exception { return TestApi.create(accounts, port, role, String.format("0917%07d", next++)); }
    @BeforeEach void cleanQueueAndActiveTrips() {
        transactions.executeWithoutResult(status -> { for (var ride : rides.findByStatusInOrderByIdAsc(TripService.ACTIVE)) { ride.status = "CANCELLED"; rides.save(ride); } });
        queue.deleteAll();
    }
    TestApi.Session driver() throws Exception {
        var driver = session(Account.Role.DRIVER);
        trips.updateDriver(driver.account().getId(), new TripService.VehicleInput(true, "RCPT", "RCPT", "Test vehicle"));
        return driver;
    }
    long book(TestApi.Session passenger, TestApi.Session driver, boolean walk) throws Exception {
        driver.api().request("POST", "/driver/queue/join", Map.of(), 200);
        var owner = walk ? driver : passenger;
        var quote = owner.api().request("POST", walk ? "/driver/walk-in-quotes" : "/passenger/quotes", TestApi.quoteInput(1), 201);
        var ride = owner.api().request("POST", walk ? "/driver/walk-ins" : "/passenger/rides", Map.of("quoteId", quote.get("quoteId").asText()), 201);
        long id = ride.get("id").asLong();
        if (!walk) driver.api().request("POST", "/driver/rides/" + id + "/accept", Map.of(), 200);
        return id;
    }
    void complete(TestApi.Session driver, long id) throws Exception {
        driver.api().request("POST", "/driver/rides/" + id + "/start", Map.of(), 200);
        driver.api().request("POST", "/driver/rides/" + id + "/complete", Map.of(), 200);
    }
    @Test void completedReceiptUsesSavedCashAndIsPrivateToItsOwnersOrAdmin() throws Exception {
        var p = session(Account.Role.PASSENGER); var d = driver(); var admin = session(Account.Role.ADMIN);
        long id = book(p, d, false); complete(d, id);
        var response = p.api().send("GET", "/passenger/rides/" + id + "/receipt", null, false);
        assertEquals(200, response.statusCode());
        assertTrue(response.headers().firstValue("Cache-Control").orElse("").contains("no-store"));
        var receipt = TestApi.JSON.readTree(response.body());
        assertEquals("TRI-" + String.format("%08d", id), receipt.get("receiptNumber").asText());
        assertEquals("PHP", receipt.get("currency").asText()); assertEquals("Asia/Manila", receipt.get("timezone").asText());
        var entry = cash.findByRideId(id).orElseThrow();
        assertEquals(0, entry.cashCollected.compareTo(new BigDecimal(receipt.get("cashCollected").asText())));
        assertEquals(0, entry.driverNet.compareTo(new BigDecimal(receipt.get("driverNet").asText())));
        assertEquals(0, entry.platformDue.compareTo(new BigDecimal(receipt.get("platformFeesDue").asText())));
        assertFalse(receipt.has("mobile")); assertFalse(receipt.has("pickupLat")); assertFalse(receipt.has("passwordHash"));
        assertEquals(id, d.api().get("/driver/rides/" + id + "/receipt").get("rideId").asLong());
        assertEquals(id, admin.api().get("/admin/rides/" + id + "/receipt").get("rideId").asLong());
        session(Account.Role.PASSENGER).api().request("GET", "/passenger/rides/" + id + "/receipt", null, 404);
        session(Account.Role.DRIVER).api().request("GET", "/driver/rides/" + id + "/receipt", null, 404);
        new TestApi(port).request("GET", "/passenger/rides/" + id + "/receipt", null, 401);
        p.api().request("GET", "/admin/rides/" + id + "/receipt", null, 403);
        long count = cash.count();
        d.api().request("POST", "/driver/rides/" + id + "/complete", Map.of(), 200);
        assertEquals(count, cash.count());
        assertEquals(receipt.get("cashCollected"), p.api().get("/passenger/rides/" + id + "/receipt").get("cashCollected"));
    }
    @Test void activeAndCancelledTripsCannotIssueReceiptsOrLeakStateToOtherAccounts() throws Exception {
        var p = session(Account.Role.PASSENGER); var d = driver(); long id = book(p, d, false);
        p.api().request("GET", "/passenger/rides/" + id + "/receipt", null, 409);
        session(Account.Role.PASSENGER).api().request("GET", "/passenger/rides/" + id + "/receipt", null, 404);
        p.api().request("POST", "/passenger/rides/" + id + "/cancel", Map.of(), 200);
        d.api().request("GET", "/driver/rides/" + id + "/receipt", null, 409);
        d.api().request("GET", "/driver/rides/999999999/receipt", null, 404);
    }
    @Test void walkInReceiptHasNoPassengerAccountAndZeroAppFee() throws Exception {
        var d = driver(); long id = book(null, d, true); complete(d, id);
        var receipt = d.api().get("/driver/rides/" + id + "/receipt");
        assertEquals("WALK_IN", receipt.get("source").asText());
        assertEquals("Walk-in passenger", receipt.get("passengerName").asText());
        assertEquals(0, receipt.get("platformFeesDue").asInt());
        assertEquals(receipt.get("cashCollected"), receipt.get("driverNet"));
    }
    @Test void missingOrInconsistentCashRecordsFailClosedInsteadOfInventingAmounts() throws Exception {
        var p = session(Account.Role.PASSENGER); var d = driver(); long id = book(p, d, false); complete(d, id);
        transactions.executeWithoutResult(status -> { var entry = cash.findByRideId(id).orElseThrow(); entry.cashCollected = entry.cashCollected.add(BigDecimal.ONE); cash.saveAndFlush(entry); });
        p.api().request("GET", "/passenger/rides/" + id + "/receipt", null, 503);
        transactions.executeWithoutResult(status -> cash.delete(cash.findByRideId(id).orElseThrow()));
        p.api().request("GET", "/passenger/rides/" + id + "/receipt", null, 503);
    }
    @Test void receiptKeepsTheDiscountAndPriceSnapshotAfterFarePolicyChanges() throws Exception {
        var p = session(Account.Role.PASSENGER); var d = driver();
        d.api().request("POST", "/driver/queue/join", Map.of(), 200);
        var input = new java.util.HashMap<String, Object>(TestApi.quoteInput(1)); input.put("category", "STUDENT");
        var quote = p.api().request("POST", "/passenger/quotes", input, 201);
        long id = p.api().request("POST", "/passenger/rides", Map.of("quoteId", quote.get("quoteId").asText()), 201).get("id").asLong();
        d.api().request("POST", "/driver/rides/" + id + "/accept", Map.of(), 200); complete(d, id);
        policies.saveAndFlush(new com.trisikol.trisikol_backend.fare.FarePolicy(new BigDecimal("900"), new BigDecimal("1.5"),
                new BigDecimal("100"), new BigDecimal("20"), "Isolated later policy", "TEST"));
        var receipt = p.api().get("/passenger/rides/" + id + "/receipt");
        assertEquals("STUDENT", receipt.get("category").asText());
        assertEquals(quote.get("discountAmount"), receipt.get("discountAmount"));
        assertEquals(quote.get("totalFare"), receipt.get("cashCollected"));
        assertEquals(quote.get("policyId"), receipt.get("policyId"));
    }
}
