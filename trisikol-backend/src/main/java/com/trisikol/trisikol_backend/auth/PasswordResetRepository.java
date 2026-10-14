package com.trisikol.trisikol_backend.auth;

import java.util.Optional;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

public interface PasswordResetRepository extends JpaRepository<PasswordReset, String> {
    void deleteByAccountId(Long accountId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from PasswordReset r where r.tokenHash = :hash")
    Optional<PasswordReset> lockByHash(@Param("hash") String hash);
}
