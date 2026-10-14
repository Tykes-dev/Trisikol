package com.trisikol.trisikol_backend.rides;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "fare_quotes")
public class FareQuote {
    @Id @Column(length = 36) String id;
    @Column(nullable = false) Long ownerId;
    @Column(nullable = false) Long terminalId = 1L;
    @Column(nullable = false, length = 16) String source;
    @Column(nullable = false, length = 16) String category;
    @Column(nullable = false) Long policyId;
    @Column(nullable = false) double pickupLat;
    @Column(nullable = false) double pickupLng;
    @Column(nullable = false) double dropoffLat;
    @Column(nullable = false) double dropoffLng;
    @Column(nullable = false, length = 150) String pickupLabel;
    @Column(nullable = false, length = 150) String dropoffLabel;
    @Column(nullable = false, precision = 10, scale = 3) BigDecimal distanceKm;
    @Column(nullable = false, precision = 10, scale = 2) BigDecimal rawFare;
    @Column(nullable = false, precision = 10, scale = 2) BigDecimal discountAmount;
    @Column(nullable = false, precision = 10, scale = 2) BigDecimal matrixFare;
    @Column(nullable = false, precision = 10, scale = 2) BigDecimal serviceFee;
    @Column(nullable = false, precision = 10, scale = 2) BigDecimal totalFare;
    @Column(nullable = false, columnDefinition = "TEXT") String routeJson;
    @Column(nullable = false) Instant createdAt;
    @Column(nullable = false) Instant expiresAt;
    protected FareQuote() {}
}
