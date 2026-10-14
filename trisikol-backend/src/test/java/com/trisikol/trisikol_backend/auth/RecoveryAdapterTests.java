package com.trisikol.trisikol_backend.auth;

import java.nio.file.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.*;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

class RecoveryAdapterTests {
    @TempDir Path directory;
    @Test void localAdapterWritesOnlyToTheConfiguredPrivateOutbox() throws Exception {
        var delivery = new LocalResetDelivery(true, directory.resolve("outbox").toString());
        delivery.deliver("09170000000", "synthetic-code-not-a-real-secret");
        try (var files = Files.list(directory.resolve("outbox"))) {
            var paths = files.toList(); assertEquals(1, paths.size());
            var contents = Files.readString(paths.get(0));
            assertTrue(contents.contains("LOCAL DEMO ONLY - NO SMS SENT"));
            assertTrue(contents.contains("synthetic-code-not-a-real-secret"));
        }
    }
    @Test void disabledAdapterDoesNotCreateAnOutbox() {
        var folder = directory.resolve("disabled"); var delivery = new LocalResetDelivery(false, folder.toString());
        assertFalse(delivery.available());
        assertThrows(ResponseStatusException.class, () -> delivery.deliver("09170000000", "not-a-real-code"));
        assertFalse(Files.exists(folder));
    }
    @Test void requestAndRedemptionShareTheLoginAbuseLimit() throws Exception {
        var filter = new AuthRateLimitFilter(); var calls = new AtomicInteger();
        String[] paths = {"/api/auth/login", "/api/auth/register", "/api/auth/forgot-password", "/api/auth/reset-password"};
        for (int i = 0; i < 31; i++) {
            var request = new MockHttpServletRequest("POST", paths[i % paths.length]); request.setServletPath(paths[i % paths.length]);
            var response = new MockHttpServletResponse(); filter.doFilter(request, response, (r, s) -> calls.incrementAndGet());
            if (i == 30) { assertEquals(429, response.getStatus()); assertEquals("900", response.getHeader("Retry-After")); }
        }
        assertEquals(30, calls.get());
    }
}
