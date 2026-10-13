package com.trisikol.trisikol_backend.rides;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface QueueRepository extends JpaRepository<QueueEntry, Long> {
    List<QueueEntry> findAllByOrderByIdAsc();
    Optional<QueueEntry> findByDriverId(Long driverId);
}
