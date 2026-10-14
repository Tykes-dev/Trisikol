package com.trisikol.trisikol_backend.auth;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PasswordRecoveryService {
    private final AccountRepository accounts;
    private final PasswordResetRepository resets;
    private final PasswordEncoder passwords;
    private final ResetDelivery delivery;
    private final jakarta.persistence.EntityManager entityManager;
    private final SecureRandom random = new SecureRandom();
    public PasswordRecoveryService(AccountRepository accounts, PasswordResetRepository resets, PasswordEncoder passwords, ResetDelivery delivery, jakarta.persistence.EntityManager entityManager) {
        this.accounts = accounts; this.resets = resets; this.passwords = passwords; this.delivery = delivery; this.entityManager = entityManager;
    }
    public boolean available() { return delivery.available(); }
    @Transactional public void request(String mobile) {
        if (mobile == null || !mobile.matches("09[0-9]{9}")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use an 11-digit 09 mobile number.");
        if (!available()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Password recovery delivery is not configured.");
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var account = accounts.lockByMobile(mobile);
        if (account.isPresent()) {
            resets.deleteByAccountId(account.get().getId()); resets.flush();
            resets.saveAndFlush(new PasswordReset(digest(token), account.get().getId(), Instant.now().plusSeconds(900)));
        }
        // Same private demo-delivery behavior for known/unknown numbers; no existence signal in the response.
        // An unknown-number code is deliberately unusable. This is NOT an SMS adapter.
        delivery.deliver(mobile, token);
    }
    @Transactional public void reset(String token, String password) {
        if (password == null || password.length() < 12 || password.getBytes(StandardCharsets.UTF_8).length > 72)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use at least 12 password characters (maximum 72 UTF-8 bytes).");
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) throw invalid();
        String hash = digest(token);
        var candidate = resets.findById(hash).orElseThrow(PasswordRecoveryService::invalid);
        var owner = accounts.findById(candidate.accountId).orElseThrow(PasswordRecoveryService::invalid);
        // All issuance/redemption locks the account first, so concurrent requests cannot redeem old tokens.
        var account = accounts.lockByMobile(owner.getMobile()).orElseThrow(PasswordRecoveryService::invalid);
        var saved = resets.lockByHash(hash).orElseThrow(PasswordRecoveryService::invalid);
        // Initial lookups may be cached in this persistence context while another reset commits.
        entityManager.refresh(account); entityManager.refresh(saved);
        if (saved.usedAt != null || !saved.expiresAt.isAfter(Instant.now())) throw invalid();
        account.resetPassword(passwords.encode(password)); accounts.saveAndFlush(account);
        saved.usedAt = Instant.now(); resets.saveAndFlush(saved);
    }
    static String digest(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException error) { throw new IllegalStateException(error); }
    }
    private static ResponseStatusException invalid() { return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reset code is invalid or expired. Request a new code."); }
}
