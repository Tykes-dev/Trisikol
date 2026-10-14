package com.trisikol.trisikol_backend.auth;

import java.io.IOException;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/** Durable revocation check, including sessions created concurrently with a reset. */
public final class CredentialVersionFilter extends OncePerRequestFilter {
    private final AccountRepository accounts;
    public CredentialVersionFilter(AccountRepository accounts) { this.accounts = accounts; }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AccountPrincipal principal) {
            var account = accounts.findByMobile(principal.getUsername());
            if (account.isEmpty() || account.get().getCredentialVersion() != principal.getCredentialVersion()) {
                var session = request.getSession(false); if (session != null) session.invalidate();
                SecurityContextHolder.clearContext();
                response.setStatus(401); response.setContentType("application/json");
                response.getWriter().write("{\"message\":\"Your password changed. Please sign in again.\"}"); return;
            }
        }
        chain.doFilter(request, response);
    }
}
