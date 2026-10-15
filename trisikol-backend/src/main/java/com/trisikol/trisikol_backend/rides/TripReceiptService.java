package com.trisikol.trisikol_backend.rides;

import com.trisikol.trisikol_backend.auth.*;
import java.math.BigDecimal;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TripReceiptService {
    private final RideRepository rides;
    private final QuoteRepository quotes;
    private final CashRepository cash;
    private final AccountRepository accounts;
    private final TerminalRepository terminals;
    public TripReceiptService(RideRepository rides, QuoteRepository quotes, CashRepository cash,
                              AccountRepository accounts, TerminalRepository terminals) {
        this.rides = rides; this.quotes = quotes; this.cash = cash; this.accounts = accounts; this.terminals = terminals;
    }
    public record Receipt(String receiptNumber, Long rideId, String currency, String timezone,
            Long terminalId, String terminalName, String driverName, String passengerName,
            String source, String category, Long policyId, String pickupLabel, String dropoffLabel,
            BigDecimal distanceKm, BigDecimal rawFare, BigDecimal discountAmount,
            BigDecimal cashCollected, BigDecimal driverNet, BigDecimal platformFeesDue,
            Instant bookedAt, Instant completedAt, Instant cashRecordedAt, Instant generatedAt) {}

    @Transactional(readOnly = true)
    public Receipt get(Account actor, Long id) {
        var ride = rides.findById(id).orElseThrow(TripReceiptService::notFound);
        boolean owns = actor.getRole() == Account.Role.ADMIN
                || (actor.getRole() == Account.Role.DRIVER && actor.getId().equals(ride.driverId))
                || (actor.getRole() == Account.Role.PASSENGER && actor.getId().equals(ride.passengerId));
        // Check ownership before status, so another account cannot probe trip state.
        if (!owns) throw notFound();
        if (!"COMPLETED".equals(ride.status)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Receipts are available only for completed cash trips.");
        }
        var entry = cash.findByRideId(id).orElseThrow(TripReceiptService::inconsistent);
        var quote = quotes.findById(ride.quoteId).orElseThrow(TripReceiptService::inconsistent);
        if (ride.completedAt == null || !entry.driverId.equals(ride.driverId)
                || entry.cashCollected.compareTo(quote.totalFare) != 0 || entry.driverNet.compareTo(quote.matrixFare) != 0
                || entry.platformDue.compareTo(quote.serviceFee) != 0
                || entry.cashCollected.compareTo(entry.driverNet.add(entry.platformDue)) != 0) throw inconsistent();
        String terminalName = terminals.findById(ride.terminalId).map(Terminal::getName).orElse("Terminal #" + ride.terminalId);
        String driverName = accounts.findById(ride.driverId).map(Account::getName).orElse("Driver #" + ride.driverId);
        String passengerName = ride.passengerId == null ? "Walk-in passenger"
                : accounts.findById(ride.passengerId).map(Account::getName).orElse("Passenger #" + ride.passengerId);
        return new Receipt("TRI-" + String.format("%08d", ride.id), ride.id, "PHP", "Asia/Manila", ride.terminalId,
                terminalName, driverName, passengerName, quote.source, quote.category, quote.policyId,
                quote.pickupLabel, quote.dropoffLabel, quote.distanceKm, quote.rawFare, quote.discountAmount,
                entry.cashCollected, entry.driverNet, entry.platformDue, ride.createdAt, ride.completedAt, entry.recordedAt, Instant.now());
    }
    private static ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip receipt not found."); }
    private static ResponseStatusException inconsistent() { return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "The saved cash record needs review. A receipt cannot be issued right now."); }
}
