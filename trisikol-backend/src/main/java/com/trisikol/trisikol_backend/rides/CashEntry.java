package com.trisikol.trisikol_backend.rides;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "cash_ledger")
public class CashEntry {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(nullable = false, unique = true) Long rideId;
    @Column(nullable = false) Long driverId;
    @Column(nullable = false, precision = 10, scale = 2) BigDecimal cashCollected;
    @Column(nullable = false, precision = 10, scale = 2) BigDecimal driverNet;
    @Column(nullable = false, precision = 10, scale = 2) BigDecimal platformDue;
    @Column(nullable = false) Instant recordedAt;
    protected CashEntry() {}
    CashEntry(Ride ride, FareQuote quote) {
        rideId = ride.id; driverId = ride.driverId;
        cashCollected = quote.totalFare; driverNet = quote.matrixFare;
        platformDue = quote.serviceFee; recordedAt = Instant.now();
    }
    public Long getRideId() { return rideId; }
    public BigDecimal getCashCollected() { return cashCollected; }
    public BigDecimal getDriverNet() { return driverNet; }
    public BigDecimal getPlatformDue() { return platformDue; }
    public Instant getRecordedAt() { return recordedAt; }
}
