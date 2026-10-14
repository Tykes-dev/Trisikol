package com.trisikol.trisikol_backend.rides;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;

public interface TerminalRepository extends JpaRepository<Terminal, Long> {
    java.util.List<Terminal> findAllByOrderByIdAsc();
    boolean existsByNameIgnoreCase(String name);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Terminal t where t.id = 1")
    Terminal lockDispatch(); // Global mutex also protects driver moves between terminals.
}
