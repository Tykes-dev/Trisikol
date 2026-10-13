package com.trisikol.trisikol_backend.rides;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface EventRepository extends JpaRepository<RideEvent, Long> {
    List<RideEvent> findByRideIdOrderByIdAsc(Long rideId);
}
