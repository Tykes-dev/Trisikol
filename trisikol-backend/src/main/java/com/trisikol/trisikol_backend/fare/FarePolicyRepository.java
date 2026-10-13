package com.trisikol.trisikol_backend.fare;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FarePolicyRepository extends JpaRepository<FarePolicy, Long> {
    Optional<FarePolicy> findFirstByOrderByIdDesc();
}
