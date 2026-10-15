package com.trisikol.trisikol_backend.rides;

import com.trisikol.test.TestApi;
import com.trisikol.trisikol_backend.auth.*;
import com.trisikol.trisikol_backend.fare.FarePolicyRepository;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:report-tests;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "trisikol.dispatch.require-location=false"})
class AdminReportTests {
    @Value("${local.server.port}") int port;
    @Autowired AccountService accounts;
    @Autowired RideRepository rides;
    @Autowired QuoteRepository quotes;
    @Autowired CashRepository cash;
    @Autowired TerminalRepository terminals;
    @Autowired FarePolicyRepository policies;
    @Autowired TransactionTemplate transactions;
    static int next = 7000;
    TestApi.Session admin, passenger, driver;
    @BeforeEach void setup() throws Exception {
        cash.deleteAll();
        admin = session(Account.Role.ADMIN); passenger = session(Account.Role.PASSENGER); driver = session(Account.Role.DRIVER);
    }
    TestApi.Session session(Account.Role role) throws Exception { return TestApi.create(accounts, port, role, String.format("0917%07d", next++)); }
    long terminal() throws Exception {
        return admin.api().request("POST", "/admin/terminals", Map.of("name", "Report TODA " + next++, "latitude", 15.22, "longitude", 120.56), 201).get("id").asLong();
    }
    long seed(long terminalId, String source, Instant recordedAt) {
        return transactions.execute(status -> {
            var quote = new FareQuote(); quote.id = UUID.randomUUID().toString(); quote.ownerId = passenger.account().getId();
            quote.terminalId = terminalId; quote.source = source; quote.category = source.equals("APP") ? "STUDENT" : "REGULAR";
            quote.policyId = policies.findFirstByTerminalIdOrderByIdDesc(terminalId).orElseThrow().getId();
            quote.pickupLat = 15.21608; quote.pickupLng = 120.549433; quote.dropoffLat = 15.22; quote.dropoffLng = 120.56;
            quote.pickupLabel = "Test pickup"; quote.dropoffLabel = "Test drop-off"; quote.distanceKm = new BigDecimal("1.956");
            quote.rawFare = new BigDecimal("50.00"); quote.discountAmount = new BigDecimal(source.equals("APP") ? "10.00" : "0.00");
            quote.matrixFare = quote.rawFare.subtract(quote.discountAmount); quote.serviceFee = new BigDecimal(source.equals("APP") ? "2.00" : "0.00");
            quote.totalFare = quote.matrixFare.add(quote.serviceFee); quote.routeJson = "[[15.21608,120.549433],[15.22,120.56]]";
            quote.createdAt = recordedAt.minusSeconds(900); quote.expiresAt = recordedAt.minusSeconds(600); quotes.saveAndFlush(quote);
            var ride = new Ride(); ride.terminalId = terminalId; ride.quoteId = quote.id;
            ride.passengerId = source.equals("APP") ? passenger.account().getId() : null; ride.driverId = driver.account().getId();
            ride.status = "COMPLETED"; ride.createdAt = recordedAt.minusSeconds(900); ride.updatedAt = recordedAt; ride.completedAt = recordedAt; rides.saveAndFlush(ride);
            var entry = new CashEntry(ride, quote); entry.recordedAt = recordedAt; cash.saveAndFlush(entry); return ride.id;
        });
    }
    @Test void reportFiltersInclusiveManilaDatesAndReconcilesEveryBreakdown() throws Exception {
        long other = terminal();
        seed(1, "APP", Instant.parse("2026-10-14T15:59:59.999Z")); // Manila Oct 14, excluded
        long app = seed(1, "APP", Instant.parse("2026-10-14T16:00:00Z")); // Manila Oct 15 start
        seed(other, "WALK_IN", Instant.parse("2026-10-15T15:59:59.999Z")); // Manila Oct 15 end
        seed(other, "APP", Instant.parse("2026-10-15T16:00:00Z")); // Manila Oct 16, excluded
        // Booking happened on the previous Manila date; accounting uses the cash record.
        var response = admin.api().send("GET", "/admin/reports?from=2026-10-15&to=2026-10-15", null, false);
        assertEquals(200, response.statusCode()); assertTrue(response.headers().firstValue("Cache-Control").orElse("").contains("no-store"));
        var report = TestApi.JSON.readTree(response.body()); var totals = report.get("totals");
        assertEquals("Asia/Manila", report.get("timezone").asText()); assertEquals("CASH_RECORDED_AT", report.get("dateBasis").asText());
        assertEquals(2, totals.get("completedTrips").asInt()); assertEquals(92, totals.get("cashCollected").asInt());
        assertEquals(90, totals.get("driverNet").asInt()); assertEquals(2, totals.get("platformFeesDue").asInt());
        assertEquals(10, totals.get("discountAmount").asInt()); assertEquals(46, totals.get("averageCashFare").asInt());
        assertEquals(new BigDecimal("3.912"), new BigDecimal(totals.get("distanceKm").asText()));
        assertEquals(1, report.get("daily").size()); assertEquals(92, report.get("daily").get(0).get("totals").get("cashCollected").asInt());
        int sourceCash = 0, terminalCash = 0;
        for (var source : report.get("bySource")) sourceCash += source.get("totals").get("cashCollected").asInt();
        for (var item : report.get("byTerminal")) terminalCash += item.get("totals").get("cashCollected").asInt();
        assertEquals(92, sourceCash); assertEquals(92, terminalCash);
        assertEquals(app, report.get("trips").get(0).get("rideId").asLong());
        var scoped = admin.api().get("/admin/reports?from=2026-10-15&to=2026-10-15&terminalId=" + other);
        assertEquals(1, scoped.get("totals").get("completedTrips").asInt()); assertEquals(50, scoped.get("totals").get("cashCollected").asInt());
        assertEquals(0, scoped.get("totals").get("platformFeesDue").asInt());
        assertFalse(response.body().contains("mobile")); assertFalse(response.body().contains("pickupLat"));
    }
    @Test void reportIncludesMoreThanRecentHistoryLimitAndReturnsZeroDaysWithoutInventedRecords() throws Exception {
        transactions.executeWithoutResult(status -> { for (int i = 0; i < 101; i++) seed(1, "WALK_IN", Instant.parse("2026-10-15T01:00:00Z").plusSeconds(i)); });
        var report = admin.api().get("/admin/reports?from=2026-10-14&to=2026-10-15");
        assertEquals(101, report.get("trips").size()); assertEquals(101, report.get("totals").get("completedTrips").asInt());
        assertEquals(5050, report.get("totals").get("cashCollected").asInt());
        assertEquals(0, report.get("daily").get(0).get("totals").get("completedTrips").asInt());
        var empty = admin.api().get("/admin/reports?from=2026-10-16&to=2026-10-17");
        assertEquals(0, empty.get("trips").size()); assertEquals(0, empty.get("totals").get("cashCollected").asInt());
        assertEquals(2, empty.get("daily").size()); assertEquals(2, empty.get("bySource").size());
    }
    @Test void reportRequiresAdminAndRejectsInvalidFilters() throws Exception {
        String path = "/admin/reports?from=2026-10-15&to=2026-10-15";
        new TestApi(port).request("GET", path, null, 401);
        passenger.api().request("GET", path, null, 403); driver.api().request("GET", path, null, 403);
        for (String query : List.of("from=bad&to=2026-10-15", "from=2026-02-30&to=2026-03-01", "from=2026-10-16&to=2026-10-15",
                "from=2026-01-01&to=2026-04-04", "from=1999-12-31&to=2000-01-01", "from=2026-10-15&to=2026-10-15&terminalId=-1",
                "from=2026-10-15&to=2026-10-15&terminalId=invalid")) {
            admin.api().request("GET", "/admin/reports?" + query, null, 400);
        }
        admin.api().request("GET", path + "&terminalId=999999999", null, 404);
        admin.api().request("GET", "/admin/reports", null, 400);
    }
    @Test void inconsistentLedgerEntryRejectsWholeReportRatherThanReturningMisleadingTotals() throws Exception {
        long id = seed(1, "APP", Instant.parse("2026-10-15T01:00:00Z"));
        transactions.executeWithoutResult(status -> { var entry = cash.findByRideId(id).orElseThrow(); entry.driverNet = BigDecimal.ZERO; cash.saveAndFlush(entry); });
        admin.api().request("GET", "/admin/reports?from=2026-10-15&to=2026-10-15", null, 503);
    }
}
