package com.trisikol.trisikol_backend.rides;
import java.util.List;
import java.util.Optional;
import java.time.Instant;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.math.BigDecimal;

public interface CashRepository extends JpaRepository<CashEntry, Long> {
    Optional<CashEntry> findByRideId(Long rideId);
    @Query("select c from CashEntry c join Ride r on r.id = c.rideId where c.recordedAt >= :start and c.recordedAt < :end and (:terminalId is null or r.terminalId = :terminalId) order by c.recordedAt, c.id")
    List<CashEntry> findForReport(@Param("start") Instant start, @Param("end") Instant end,
                                @Param("terminalId") Long terminalId, Pageable page);
    List<CashEntry> findByDriverIdOrderByIdDesc(Long id);
    @Query("select coalesce(sum(c.driverNet), 0) from CashEntry c") BigDecimal totalDriverNet();
    @Query("select coalesce(sum(c.platformDue), 0) from CashEntry c") BigDecimal totalPlatformDue();
    @Query("select coalesce(sum(c.cashCollected), 0) from CashEntry c") BigDecimal totalCash();
}
