package com.trisikol.trisikol_backend.rides;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Proximity only: this does not determine service coverage, availability, or fare distance. */
@Service
public class TerminalDiscoveryService {
    private final TerminalRepository terminals;
    public TerminalDiscoveryService(TerminalRepository terminals) { this.terminals = terminals; }

    public record Pickup(Double lat, Double lng) {}
    public record Input(Pickup pickup) {}
    public record Suggestion(Long id, String name, BigDecimal latitude, BigDecimal longitude,
                             double straightLineDistanceKm) {}
    public record Result(String distanceBasis, boolean coverageVerified, List<Suggestion> terminals) {}

    @Transactional(readOnly = true)
    public Result suggest(Input input) {
        var pickup = input == null ? null : input.pickup();
        if (pickup == null || pickup.lat() == null || pickup.lng() == null
                || !Double.isFinite(pickup.lat()) || !Double.isFinite(pickup.lng())
                || Math.abs(pickup.lat()) > 90 || Math.abs(pickup.lng()) > 180) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid pickup pin before finding nearby TODAs.");
        }
        var suggestions = terminals.findAllByOrderByIdAsc().stream()
                .map(terminal -> new Suggestion(terminal.id, terminal.name, terminal.latitude, terminal.longitude,
                        distanceKm(pickup.lat(), pickup.lng(), terminal.latitude.doubleValue(), terminal.longitude.doubleValue())))
                .sorted(Comparator.comparingDouble(Suggestion::straightLineDistanceKm).thenComparing(Suggestion::id))
                .toList();
        return new Result("STRAIGHT_LINE", false, suggestions);
    }

    static double distanceKm(double fromLat, double fromLng, double toLat, double toLng) {
        double dLat = Math.toRadians(toLat - fromLat), dLng = Math.toRadians(toLng - fromLng);
        double a = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(Math.toRadians(fromLat)) * Math.cos(Math.toRadians(toLat)) * Math.pow(Math.sin(dLng / 2), 2);
        // Clamp floating-point drift at coincident / antipodal points.
        a = Math.max(0, Math.min(1, a));
        return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
