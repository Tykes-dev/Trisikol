package com.trisikol.trisikol_backend.auth;

import java.security.Principal;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class AuthController {
    private final AccountService accounts;
    public AuthController(AccountService accounts) { this.accounts = accounts; }

    @GetMapping("/auth/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
    }
    // No client-supplied role is used: public registration always creates passengers.
    public record Registration(String name, String mobile, String password) {}
    @PostMapping("/auth/register") @ResponseStatus(HttpStatus.CREATED)
    public AccountService.View register(@RequestBody Registration input) {
        return AccountService.View.of(accounts.create(input.name(), input.mobile(), input.password(), Account.Role.PASSENGER));
    }
    @GetMapping("/auth/me")
    public AccountService.View me(Principal principal) {
        return AccountService.View.of(accounts.current(principal.getName()));
    }
    public record ProfileInput(String name) {}
    @PutMapping("/auth/profile")
    public AccountService.View profile(Principal principal, @RequestBody ProfileInput input) {
        return accounts.rename(principal.getName(), input.name());
    }
    @PostMapping("/admin/drivers") @ResponseStatus(HttpStatus.CREATED)
    public AccountService.View driver(@RequestBody Registration input) {
        return AccountService.View.of(accounts.create(input.name(), input.mobile(), input.password(), Account.Role.DRIVER));
    }
    // Small protected resources to verify role enforcement before booking APIs exist.
    @GetMapping({"/passenger/profile", "/driver/profile", "/admin/profile"})
    public AccountService.View profile(Principal principal) { return me(principal); }
}
