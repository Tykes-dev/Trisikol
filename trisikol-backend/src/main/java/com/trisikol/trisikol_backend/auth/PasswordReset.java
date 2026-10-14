package com.trisikol.trisikol_backend.auth;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name = "password_resets")
public class PasswordReset {
    @Id @Column(name = "token_hash", length = 64) String tokenHash;
    @Column(name = "account_id", nullable = false) Long accountId;
    @Column(name = "expires_at", nullable = false) Instant expiresAt;
    @Column(name = "used_at") Instant usedAt;
    protected PasswordReset() {}
    PasswordReset(String hash, Long accountId, Instant expiresAt) {
        this.tokenHash = hash; this.accountId = accountId; this.expiresAt = expiresAt;
    }
}
