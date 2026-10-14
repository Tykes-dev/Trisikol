package com.trisikol.trisikol_backend.auth;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountRepository extends JpaRepository<Account, Long> {
    Optional<Account> findByMobile(String mobile);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select a from Account a where a.mobile = :mobile")
    Optional<Account> lockByMobile(@org.springframework.data.repository.query.Param("mobile") String mobile);
    boolean existsByRole(Account.Role role);
    java.util.List<Account> findByRoleOrderByIdAsc(Account.Role role);
}
