package com.trisikol.trisikol_backend.rides;

import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class TerminalDiscoveryTests {
    @Test void coincidentPointsHaveZeroDistance() {
        assertEquals(0, TerminalDiscoveryService.distanceKm(15.21608, 120.549433, 15.21608, 120.549433));
    }
    @Test void oneDegreeAtEquatorAndSymmetryUseKilometres() {
        double forward = TerminalDiscoveryService.distanceKm(0, 0, 0, 1);
        assertEquals(111.195, forward, .001);
        assertEquals(forward, TerminalDiscoveryService.distanceKm(0, 1, 0, 0), 1e-9);
    }
    @Test void crossingDateLineTakesShortDistance() {
        assertEquals(222.39, TerminalDiscoveryService.distanceKm(0, 179, 0, -179), .01);
    }
    @Test void antipodalAndPolarPointsStayFinite() {
        for (var points : List.of(new double[]{0, 0, 0, 180}, new double[]{90, 0, -90, 180}, new double[]{89.999, 0, 89.999, 180})) {
            double distance = TerminalDiscoveryService.distanceKm(points[0], points[1], points[2], points[3]);
            assertTrue(Double.isFinite(distance));
            assertTrue(distance >= 0 && distance <= Math.PI * 6371);
        }
    }
    @Test void invalidOrIncompletePickupIsRejectedBeforeQueryingTheDatabase() {
        var service = new TerminalDiscoveryService(null);
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> service.suggest(null));
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> service.suggest(new TerminalDiscoveryService.Input(null)));
        for (var point : List.of(new TerminalDiscoveryService.Pickup(null, 0d), new TerminalDiscoveryService.Pickup(0d, null),
                new TerminalDiscoveryService.Pickup(Double.NaN, 0d), new TerminalDiscoveryService.Pickup(0d, Double.POSITIVE_INFINITY),
                new TerminalDiscoveryService.Pickup(91d, 0d), new TerminalDiscoveryService.Pickup(0d, -181d))) {
            assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> service.suggest(new TerminalDiscoveryService.Input(point)));
        }
    }
}
