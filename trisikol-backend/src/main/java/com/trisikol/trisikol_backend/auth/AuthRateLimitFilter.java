package com.trisikol.trisikol_backend.auth;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.web.filter.OncePerRequestFilter;

/** Single-instance abuse guard; replace with a shared gateway limiter when scaling. */
public class AuthRateLimitFilter extends OncePerRequestFilter {
    private record Window(long starts, int count) {}
    private final Map<String, Window> attempts = new HashMap<>();
    private synchronized boolean allowed(String address) {
        long now = System.currentTimeMillis();
        attempts.entrySet().removeIf(entry -> now - entry.getValue().starts() >= 900_000);
        Window window = attempts.get(address);
        if (window == null) {
            if (attempts.size() >= 10_000) return false;
            attempts.put(address, new Window(now, 1)); return true;
        }
        if (window.count() >= 30) return false;
        attempts.put(address, new Window(window.starts(), window.count() + 1)); return true;
    }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
        throws ServletException, IOException {
        if ("POST".equals(request.getMethod()) &&
            ("/api/auth/login".equals(request.getServletPath()) || "/api/auth/register".equals(request.getServletPath())) &&
            !allowed(request.getRemoteAddr())) {
            response.setStatus(429); response.setHeader("Retry-After", "900");
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Too many attempts. Try again in 15 minutes.\"}"); return;
        }
        chain.doFilter(request, response);
    }
}
