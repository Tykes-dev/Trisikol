package com.trisikol.trisikol_backend.rides;
import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name = "ride_events")
public class RideEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(nullable = false) Long rideId;
    @Column(nullable = false, length = 20) String status;
    @Column(nullable = false, length = 50) String actor;
    @Column(nullable = false) Instant occurredAt;
    protected RideEvent() {}
    RideEvent(Ride ride, String actor) {
        rideId = ride.id; status = ride.status; this.actor = actor; occurredAt = Instant.now();
    }
    public Long getId() { return id; }
    public String getStatus() { return status; }
    public String getActor() { return actor; }
    public Instant getOccurredAt() { return occurredAt; }
}
