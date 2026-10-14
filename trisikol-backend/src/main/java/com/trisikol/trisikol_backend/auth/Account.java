package com.trisikol.trisikol_backend.auth;

import jakarta.persistence.*;

@Entity
@Table(name = "app_users")
public class Account {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 100)
    private String name;
    @Column(nullable = false, unique = true, length = 11)
    private String mobile;
    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;
    @Column(name = "credential_version", nullable = false)
    private long credentialVersion;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16)
    private Role role;

    protected Account() {}
    public Account(String name, String mobile, String passwordHash, Role role) {
        this.name = name; this.mobile = mobile; this.passwordHash = passwordHash; this.role = role;
    }
    public Long getId() { return id; }
    public String getName() { return name; }
    void rename(String name) { this.name = name; }
    public String getMobile() { return mobile; }
    public String getPasswordHash() { return passwordHash; }
    public long getCredentialVersion() { return credentialVersion; }
    void resetPassword(String hash) { passwordHash = hash; credentialVersion++; }
    public Role getRole() { return role; }
    public enum Role { PASSENGER, DRIVER, ADMIN }
}
