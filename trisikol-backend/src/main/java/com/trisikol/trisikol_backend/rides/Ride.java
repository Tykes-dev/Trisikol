package com.trisikol.trisikol_backend.rides;
import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name = "rides")
public class Ride {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(nullable = false) Long terminalId = 1L;
    @Column(nullable = false, unique = true, length = 36) String quoteId;
    Long passengerId;
    Long driverId;
    @Column(nullable = false, length = 20) String status;
    @Column(nullable = false) Instant createdAt;
    @Column(nullable = false) Instant updatedAt;
    Instant offerExpiresAt;
    Instant completedAt;
    protected Ride() {}
}
