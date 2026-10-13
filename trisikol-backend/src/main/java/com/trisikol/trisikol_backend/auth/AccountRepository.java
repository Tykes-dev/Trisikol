package com.trisikol.trisikol_backend.auth;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountRepository extends JpaRepository<Account, Long> {
    Optional<Account> findByMobile(String mobile);
    boolean existsByRole(Account.Role role);
    java.util.List<Account> findByRoleOrderByIdAsc(Account.Role role);
}
