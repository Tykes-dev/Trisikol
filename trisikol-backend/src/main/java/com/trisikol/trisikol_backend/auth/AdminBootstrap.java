package com.trisikol.trisikol_backend.auth;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrap implements ApplicationRunner {
    private final Environment env;
    private final AccountRepository repository;
    private final AccountService accounts;
    public AdminBootstrap(Environment env, AccountRepository repository, AccountService accounts) {
        this.env = env; this.repository = repository; this.accounts = accounts;
    }
    @Override public void run(ApplicationArguments args) {
        String mobile = env.getProperty("TRISIKOL_ADMIN_MOBILE", "");
        String password = env.getProperty("TRISIKOL_ADMIN_PASSWORD", "");
        if (mobile.isBlank() && password.isBlank()) return;
        if (repository.existsByRole(Account.Role.ADMIN)) return;
        accounts.create("Administrator", mobile, password, Account.Role.ADMIN);
    }
}
