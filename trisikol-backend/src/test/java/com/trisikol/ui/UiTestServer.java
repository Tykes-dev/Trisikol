package com.trisikol.ui;

import com.trisikol.trisikol_backend.TrisikolBackendApplication;
import com.trisikol.trisikol_backend.auth.*;
import com.trisikol.trisikol_backend.rides.RoadRouting;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.annotation.*;

/** Explicit test-classpath entry point. Never included in the production application. */
public class UiTestServer {
    public static void main(String[] args) {
        // Fixed loopback port and dedicated ignored file DB: external args cannot select the regular DB.
        new SpringApplicationBuilder(TrisikolBackendApplication.class, Fixtures.class).run(
                "--server.port=8081", "--server.address=127.0.0.1",
                "--spring.datasource.url=jdbc:h2:file:./data/ui-tests/trisikol;MODE=MySQL;DATABASE_TO_LOWER=TRUE",
                "--spring.datasource.username=sa", "--spring.datasource.password=",
                "--spring.jpa.hibernate.ddl-auto=validate", "--server.servlet.session.cookie.secure=false",
                "--trisikol.dispatch.require-location=false",
                "--trisikol.recovery.local-outbox=true", "--trisikol.recovery.outbox-path=data/ui-tests/password-reset-outbox",
                "--TRISIKOL_ADMIN_MOBILE=", "--TRISIKOL_ADMIN_PASSWORD=");
    }

    @Configuration(proxyBeanMethods = false)
    static class Fixtures {
        @Bean @Primary RoadRouting fixtureRoute() {
            return (from, to) -> new RoadRouting.Route(new BigDecimal("1.956"),
                    List.of(List.of(from.lat(), from.lng()), List.of(to.lat(), to.lng())));
        }
        @Bean ApplicationRunner fixtureAccounts(AccountRepository repository, AccountService accounts) {
            return args -> {
                if (repository.findByMobile("09170009001").isEmpty()) {
                    accounts.create("UI Test Administrator", "09170009001", "UI-test-only-password-2026!", Account.Role.ADMIN);
                }
                if (repository.findByMobile("09170009002").isEmpty()) {
                    accounts.create("UI Test Passenger", "09170009002", "UI-test-only-password-2026!", Account.Role.PASSENGER);
                }
                if (repository.findByMobile("09170009003").isEmpty()) {
                    accounts.create("UI Test Driver", "09170009003", "UI-test-only-password-2026!", Account.Role.DRIVER);
                }
            };
        }
    }
}
