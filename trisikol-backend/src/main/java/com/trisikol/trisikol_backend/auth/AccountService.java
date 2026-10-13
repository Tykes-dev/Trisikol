package com.trisikol.trisikol_backend.auth;

import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountService {
    private final AccountRepository accounts;
    private final PasswordEncoder passwords;
    public AccountService(AccountRepository accounts, PasswordEncoder passwords) {
        this.accounts = accounts; this.passwords = passwords;
    }
    @Transactional
    public Account create(String name, String mobile, String password, Account.Role role) {
        if (name == null || name.isBlank() || name.strip().length() > 100 || mobile == null ||
            !mobile.matches("09[0-9]{9}") || password == null || password.length() < 12 ||
            password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Use a name, an 11-digit 09 mobile number, and a password of at least 12 characters (maximum 72 UTF-8 bytes).");
        }
        return accounts.saveAndFlush(new Account(name.strip(), mobile, passwords.encode(password), role));
    }
    public Account current(String mobile) {
        return accounts.findByMobile(mobile).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
    @Transactional
    public View rename(String mobile, String name) {
        if (name == null || name.isBlank() || name.strip().length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use a name of 1–100 characters.");
        }
        var account = current(mobile); account.rename(name.strip());
        return View.of(accounts.saveAndFlush(account));
    }
    public record View(Long id, String name, String mobile, Account.Role role) {
        public static View of(Account account) {
            return new View(account.getId(), account.getName(), account.getMobile(), account.getRole());
        }
    }
}
