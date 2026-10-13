package com.trisikol.trisikol_backend.rides;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.*;
import org.springframework.web.filter.OncePerRequestFilter;

/** Bound public-demo routing calls to 30/minute per signed-in account on this API instance. */
public class QuoteRateLimitFilter extends OncePerRequestFilter {
    private record Window(long started, int count) {}
    private final Map<String, Window> windows = new HashMap<>();
    private synchronized boolean allowed(String user) {
        long now = System.currentTimeMillis();
        windows.entrySet().removeIf(entry -> now - entry.getValue().started() >= 60000);
        var window = windows.get(user);
        if (window == null) {
            if (windows.size() >= 10000) return false;
            windows.put(user, new Window(now, 1)); return true;
        }
        if (window.count() >= 30) return false;
        windows.put(user, new Window(window.started(), window.count() + 1)); return true;
    }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (request.getUserPrincipal() != null && "POST".equals(request.getMethod())
                && Set.of("/api/passenger/quotes", "/api/driver/walk-in-quotes").contains(request.getServletPath())
                && !allowed(request.getUserPrincipal().getName())) {
            response.setStatus(429); response.setHeader("Retry-After", "60"); response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Too many route requests. Wait a minute before retrying.\"}"); return;
        }
        chain.doFilter(request, response);
    }
}
