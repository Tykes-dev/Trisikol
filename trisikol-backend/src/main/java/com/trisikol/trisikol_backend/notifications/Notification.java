package com.trisikol.trisikol_backend.notifications;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name = "notifications")
public class Notification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(nullable = false) Long recipientId;
    @Column(nullable = false) Long rideId;
    @Column(nullable = false) Long eventId;
    @Column(nullable = false, length = 100) String title;
    @Column(nullable = false, length = 300) String message;
    @Column(nullable = false) Instant createdAt;
    Instant readAt;
    protected Notification() {}
    Notification(Long recipientId, Long rideId, Long eventId, String title, String message, Instant createdAt) {
        this.recipientId = recipientId; this.rideId = rideId; this.eventId = eventId;
        this.title = title; this.message = message; this.createdAt = createdAt;
    }
}
