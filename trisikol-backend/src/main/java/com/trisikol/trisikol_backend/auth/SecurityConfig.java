package com.trisikol.trisikol_backend.auth;

import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import com.trisikol.trisikol_backend.rides.QuoteRateLimitFilter;

@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder passwords() { return new BCryptPasswordEncoder(12); }
    @Bean UserDetailsService users(AccountRepository accounts) {
        return mobile -> accounts.findByMobile(mobile)
            .map(account -> User.withUsername(account.getMobile()).password(account.getPasswordHash())
                .roles(account.getRole().name()).build())
            .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));
    }
    @Bean SecurityFilterChain security(HttpSecurity http) throws Exception {
        // Default session CSRF protection remains enabled, including login and logout.
        http.authorizeHttpRequests(auth -> auth
            .requestMatchers(HttpMethod.GET, "/api/auth/csrf").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/register").permitAll()
            .requestMatchers("/api/admin/**").hasRole("ADMIN")
            .requestMatchers("/api/driver/**").hasRole("DRIVER")
            .requestMatchers("/api/passenger/**").hasRole("PASSENGER")
            .requestMatchers("/api/auth/me", "/api/auth/logout", "/api/auth/profile").authenticated()
            .requestMatchers("/api/notifications", "/api/notifications/**").authenticated()
            .requestMatchers(HttpMethod.GET, "/api/fares/current").authenticated()
            .requestMatchers(HttpMethod.GET, "/api/terminals/current", "/api/terminals").authenticated()
            .anyRequest().denyAll())
            .requestCache(cache -> cache.disable())
            .formLogin(login -> login.loginProcessingUrl("/api/auth/login").usernameParameter("mobile")
                .successHandler((request, response, authentication) -> response.setStatus(204))
                .failureHandler((request, response, error) -> {
                    response.setStatus(401); response.setContentType("application/json");
                    response.getWriter().write("{\"message\":\"Invalid mobile number or password.\"}");
                }))
            .logout(logout -> logout.logoutUrl("/api/auth/logout").deleteCookies("JSESSIONID")
                .logoutSuccessHandler((request, response, authentication) -> response.setStatus(204)))
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, error) -> {
                    response.setStatus(401); response.setContentType("application/json");
                    response.getWriter().write("{\"message\":\"Please sign in.\"}");
                })
                .accessDeniedHandler((request, response, error) -> {
                    response.setStatus(403); response.setContentType("application/json");
                    response.getWriter().write("{\"message\":\"This action is not allowed.\"}");
                }))
            .addFilterBefore(new AuthRateLimitFilter(), UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(new QuoteRateLimitFilter(), AuthorizationFilter.class);
        return http.build();
    }
}
