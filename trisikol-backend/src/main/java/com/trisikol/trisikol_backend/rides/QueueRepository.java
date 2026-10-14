package com.trisikol.trisikol_backend.rides;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface QueueRepository extends JpaRepository<QueueEntry, Long> {
    List<QueueEntry> findAllByOrderByIdAsc();
    List<QueueEntry> findByTerminalIdOrderByIdAsc(Long terminalId);
    boolean existsByTerminalId(Long terminalId);
    Optional<QueueEntry> findByDriverId(Long driverId);
}
