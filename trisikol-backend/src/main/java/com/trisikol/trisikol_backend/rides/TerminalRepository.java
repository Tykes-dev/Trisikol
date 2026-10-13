package com.trisikol.trisikol_backend.rides;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;

public interface TerminalRepository extends JpaRepository<Terminal, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Terminal t where t.id = 1")
    Terminal lockDispatch();
}
