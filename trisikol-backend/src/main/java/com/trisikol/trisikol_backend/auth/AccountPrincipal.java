package com.trisikol.trisikol_backend.auth;

import java.util.List;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;

/** Capture the credential revision at login; reset invalidates every older session. */
public final class AccountPrincipal extends User {
    private final long credentialVersion;
    public AccountPrincipal(Account account) {
        super(account.getMobile(), account.getPasswordHash(), List.of(new SimpleGrantedAuthority("ROLE_" + account.getRole().name())));
        credentialVersion = account.getCredentialVersion();
    }
    public long getCredentialVersion() { return credentialVersion; }
}
