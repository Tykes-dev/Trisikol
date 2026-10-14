package com.trisikol.trisikol_backend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/auth")
public class PasswordRecoveryController {
    private final PasswordRecoveryService recovery;
    public PasswordRecoveryController(PasswordRecoveryService recovery) { this.recovery = recovery; }
    public record Request(String mobile) {}
    public record Reset(String token, String password) {}
    public record Info(boolean available, String deliveryMode) {}
    public record Message(String message) {}
    @GetMapping("/recovery-info") public Info info() { return new Info(recovery.available(), recovery.available() ? "LOCAL_DEMO" : "UNAVAILABLE"); }
    @PostMapping("/forgot-password") @ResponseStatus(HttpStatus.ACCEPTED)
    public Message request(@RequestBody Request input) {
        recovery.request(input.mobile());
        return new Message("If the account exists, recovery instructions are available through the configured delivery channel. Local demo: no SMS was sent.");
    }
    @PostMapping("/reset-password") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reset(@RequestBody Reset input) { recovery.reset(input.token(), input.password()); }
}
