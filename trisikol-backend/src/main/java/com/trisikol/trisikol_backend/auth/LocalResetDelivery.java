package com.trisikol.trisikol_backend.auth;

import java.io.IOException;
import java.nio.file.*;
import java.time.Instant;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Never served over HTTP or printed to logs. Contains secrets: local synthetic accounts only. */
@Component
public class LocalResetDelivery implements ResetDelivery {
    private final boolean enabled;
    private final Path folder;
    public LocalResetDelivery(@Value("${trisikol.recovery.local-outbox:false}") boolean enabled,
            @Value("${trisikol.recovery.outbox-path:data/password-reset-outbox}") String folder) {
        this.enabled = enabled; this.folder = Path.of(folder);
    }
    public boolean available() { return enabled; }
    public void deliver(String mobile, String token) {
        if (!enabled) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Password recovery delivery is not configured.");
        try {
            Files.createDirectories(folder);
            Files.writeString(folder.resolve(UUID.randomUUID() + ".txt"),
                    "LOCAL DEMO ONLY - NO SMS SENT\nMobile: " + mobile + "\nReset code: " + token +
                    "\nExpires: " + Instant.now().plusSeconds(900) + "\nDelete this file after use.\n", StandardOpenOption.CREATE_NEW);
        } catch (IOException error) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Password recovery delivery is unavailable.");
        }
    }
}
