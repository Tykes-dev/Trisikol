package com.trisikol.trisikol_backend.auth;

import com.trisikol.test.TestApi;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.*;
import org.springframework.context.annotation.*;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:recovery-tests;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1"})
@Import(PasswordRecoveryTests.DeliveryConfig.class)
class PasswordRecoveryTests {
    static class TestDelivery implements ResetDelivery {
        final Map<String, String> codes = new ConcurrentHashMap<>(); boolean enabled = true;
        public boolean available() { return enabled; }
        public void deliver(String mobile, String token) { codes.put(mobile, token); }
    }
    @TestConfiguration static class DeliveryConfig { @Bean @Primary TestDelivery testDelivery() { return new TestDelivery(); } }
    @Value("${local.server.port}") int port;
    @Autowired AccountService accounts;
    @Autowired AccountRepository accountRepository;
    @Autowired PasswordRecoveryService recovery;
    @Autowired PasswordResetRepository resets;
    @Autowired TestDelivery delivery;
    @Autowired TransactionTemplate transactions;
    static int next = 3000;
    static final String NEW_PASSWORD = "Changed-tests-only-password!";
    @BeforeEach void enable() { delivery.enabled = true; }
    TestApi.Session session() throws Exception { return TestApi.create(accounts, port, Account.Role.PASSENGER, String.format("0917%07d", next++)); }
    String issue(Account account) { recovery.request(account.getMobile()); return delivery.codes.get(account.getMobile()); }

    @Test void recoveryIsGenericCsrfProtectedAndDoesNotExposeTokens() throws Exception {
        var owner = session(); var anonymous = new TestApi(port); String mobile = owner.account().getMobile();
        assertEquals(403, anonymous.send("POST", "/auth/forgot-password", TestApi.JSON.writeValueAsString(Map.of("mobile", mobile)), false).statusCode());
        var existing = anonymous.request("POST", "/auth/forgot-password", Map.of("mobile", mobile), 202);
        var unknown = anonymous.request("POST", "/auth/forgot-password", Map.of("mobile", "09999999999"), 202);
        assertEquals(existing, unknown);
        String token = delivery.codes.get(mobile); assertEquals(43, token.length());
        assertFalse(existing.toString().contains(token)); assertFalse(resets.existsById(token));
        assertTrue(resets.existsById(PasswordRecoveryService.digest(token)));
        assertEquals(403, anonymous.send("POST", "/auth/reset-password", TestApi.JSON.writeValueAsString(Map.of("token", token, "password", NEW_PASSWORD)), false).statusCode());
        anonymous.request("POST", "/auth/reset-password", Map.of("token", delivery.codes.get("09999999999"), "password", NEW_PASSWORD), 400);
        anonymous.request("POST", "/auth/forgot-password", Map.of("mobile", "invalid"), 400);
    }
    @Test void resetWorksOnceAndRevokesAllOldSessions() throws Exception {
        var owner = session(); var otherSession = new TestApi(port); var anonymous = new TestApi(port);
        assertEquals(204, otherSession.login(owner.account().getMobile(), TestApi.PASSWORD));
        String token = issue(owner.account());
        anonymous.request("POST", "/auth/reset-password", Map.of("token", token, "password", "short"), 400);
        anonymous.request("POST", "/auth/reset-password", Map.of("token", token, "password", NEW_PASSWORD), 204);
        anonymous.request("POST", "/auth/reset-password", Map.of("token", token, "password", NEW_PASSWORD), 400);
        assertEquals(401, owner.api().send("GET", "/auth/me", null, false).statusCode());
        assertEquals(401, otherSession.send("GET", "/auth/me", null, false).statusCode());
        assertEquals(401, new TestApi(port).login(owner.account().getMobile(), TestApi.PASSWORD));
        var fresh = new TestApi(port); assertEquals(204, fresh.login(owner.account().getMobile(), NEW_PASSWORD)); fresh.get("/auth/me");
    }
    @Test void expiredAndSupersededCodesAreRejectedWithoutChangingPassword() throws Exception {
        var owner = session(); String old = issue(owner.account()); String current = issue(owner.account());
        assertNotEquals(old, current);
        assertThrows(ResponseStatusException.class, () -> recovery.reset(old, NEW_PASSWORD));
        transactions.executeWithoutResult(status -> { var reset = resets.findById(PasswordRecoveryService.digest(current)).orElseThrow(); reset.expiresAt = Instant.now().minusSeconds(1); resets.save(reset); });
        assertThrows(ResponseStatusException.class, () -> recovery.reset(current, NEW_PASSWORD));
        assertThrows(ResponseStatusException.class, () -> recovery.reset("bad-code", NEW_PASSWORD));
        owner.api().get("/auth/me");
        assertEquals(0, accountRepository.findById(owner.account().getId()).orElseThrow().getCredentialVersion());
    }
    @Test void concurrentRedemptionHasExactlyOneWinner() throws Exception {
        var owner = session(); String token = issue(owner.account()); var executor = Executors.newFixedThreadPool(2);
        try {
            Callable<Boolean> redeem = () -> { try { recovery.reset(token, NEW_PASSWORD); return true; } catch (ResponseStatusException error) { return false; } };
            var a = executor.submit(redeem); var b = executor.submit(redeem);
            assertNotEquals(a.get(20, TimeUnit.SECONDS), b.get(20, TimeUnit.SECONDS));
            assertEquals(1, accountRepository.findById(owner.account().getId()).orElseThrow().getCredentialVersion());
        } finally { executor.shutdownNow(); }
    }
    @Test void unavailableDeliveryNeverClaimsToHaveSentInstructions() throws Exception {
        delivery.enabled = false; var api = new TestApi(port);
        assertFalse(api.get("/auth/recovery-info").get("available").asBoolean());
        api.request("POST", "/auth/forgot-password", Map.of("mobile", "09999999999"), 503);
    }
}
