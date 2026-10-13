package com.trisikol.trisikol_backend.rides;

import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

final class TerminalLocationPolicy {
    private TerminalLocationPolicy() {}
    static void validate(TripService.Position p, Terminal t, Instant now) {
        if (p == null || p.latitude() == null || p.longitude() == null || p.accuracy() == null || p.capturedAt() == null
                || !Double.isFinite(p.latitude()) || !Double.isFinite(p.longitude()) || !Double.isFinite(p.accuracy())
                || Math.abs(p.latitude()) > 90 || Math.abs(p.longitude()) > 180 || p.accuracy() < 0 || p.accuracy() > 50
                || p.capturedAt().isBefore(now.minusSeconds(30)) || p.capturedAt().isAfter(now.plusSeconds(5))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use a fresh GPS reading with accuracy within 50 metres.");
        }
        double lat1 = Math.toRadians(p.latitude()), lat2 = Math.toRadians(t.latitude.doubleValue());
        double dl = Math.toRadians(p.longitude() - t.longitude.doubleValue());
        double a = Math.pow(Math.sin((lat1 - lat2) / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dl / 2), 2);
        // Clamp floating-point drift, including near-antipodal coordinates.
        a = Math.max(0, Math.min(1, a));
        if (6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You must be within 100 metres of the terminal.");
        }
    }
}
