package com.trisikol.trisikol_backend.rides;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;

public interface RideRepository extends JpaRepository<Ride, Long> {
    Optional<Ride> findByQuoteId(String quoteId);
    List<Ride> findByStatusInOrderByIdAsc(Collection<String> statuses);
    List<Ride> findByPassengerIdOrderByIdDesc(Long id, Pageable page);
    List<Ride> findByDriverIdOrderByIdDesc(Long id, Pageable page);
}
