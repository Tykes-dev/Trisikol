package com.trisikol.trisikol_backend.rides;
import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name = "queue_entries")
public class QueueEntry {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(nullable = false, unique = true) Long driverId;
    @Column(nullable = false) Instant joinedAt;
    protected QueueEntry() {}
    QueueEntry(Long driverId) { this.driverId = driverId; joinedAt = Instant.now(); }
}
