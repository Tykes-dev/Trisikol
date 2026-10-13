package com.trisikol.trisikol_backend.rides;

import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

class TerminalLocationPolicyTests {
    private final Instant now = Instant.parse("2026-10-13T09:00:00Z");
    private Terminal terminal() {
        var terminal = new Terminal(); terminal.latitude = new BigDecimal("15.2155"); terminal.longitude = new BigDecimal("120.5487"); return terminal;
    }
    @Test void freshAccurateReadingAtTerminalIsAccepted() {
        assertDoesNotThrow(() -> TerminalLocationPolicy.validate(new TripService.Position(15.2155, 120.5487, 10.0, now), terminal(), now));
    }
    @Test void staleFutureAndImpreciseReadingsAreRejected() {
        for (var p : new TripService.Position[] {
                new TripService.Position(15.2155, 120.5487, 10.0, now.minusSeconds(31)),
                new TripService.Position(15.2155, 120.5487, 10.0, now.plusSeconds(6)),
                new TripService.Position(15.2155, 120.5487, 51.0, now),
                new TripService.Position(15.2155, 120.5487, Double.NaN, now),
                new TripService.Position(Double.NaN, 120.5487, 10.0, now), null }) {
            assertThrows(ResponseStatusException.class, () -> TerminalLocationPolicy.validate(p, terminal(), now));
        }
    }
    @Test void outsideTerminalAndAntipodalReadingsAreRejected() {
        assertThrows(ResponseStatusException.class, () -> TerminalLocationPolicy.validate(new TripService.Position(15.2255, 120.5487, 10.0, now), terminal(), now));
        assertThrows(ResponseStatusException.class, () -> TerminalLocationPolicy.validate(new TripService.Position(-15.2155, -59.4513, 10.0, now), terminal(), now));
    }
}
