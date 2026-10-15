package com.trisikol.trisikol_backend.rides;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.math.BigDecimal;

public interface CashRepository extends JpaRepository<CashEntry, Long> {
    Optional<CashEntry> findByRideId(Long rideId);
    List<CashEntry> findByDriverIdOrderByIdDesc(Long id);
    @Query("select coalesce(sum(c.driverNet), 0) from CashEntry c") BigDecimal totalDriverNet();
    @Query("select coalesce(sum(c.platformDue), 0) from CashEntry c") BigDecimal totalPlatformDue();
    @Query("select coalesce(sum(c.cashCollected), 0) from CashEntry c") BigDecimal totalCash();
}
