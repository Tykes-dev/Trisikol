package com.trisikol.trisikol_backend;

import java.sql.DriverManager;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class H2SessionRegressionTests {
    @Test void roleConstraintSurvivesMigrationConnectionRetirement() throws Exception {
        String url = "jdbc:h2:mem:retired-connection;MODE=MySQL;DATABASE_TO_LOWER=TRUE";
        try (var keeper = DriverManager.getConnection(url, "sa", "")) {
            try (var creator = DriverManager.getConnection(url, "sa", "");
                 var statement = creator.createStatement();
                 var migration = getClass().getResourceAsStream("/db/migration/V1__create_users.sql")) {
                assertNotNull(migration);
                statement.execute(new String(migration.readAllBytes(), StandardCharsets.UTF_8));
            }
            // H2 2.4.240 retains the now-closed creator session in CHECK (role IN ...).
            try (var insert = keeper.prepareStatement(
                    "INSERT INTO app_users (name,mobile,password_hash,role,id) VALUES (?,?,?,?,DEFAULT)")) {
                insert.setString(1, "Regression test");
                insert.setString(2, "09170000000");
                insert.setString(3, "test-only-not-a-real-password-hash");
                insert.setString(4, "PASSENGER");
                assertEquals(1, insert.executeUpdate());
                insert.setString(2, "09170000001");
                insert.setString(4, "INVALID_ROLE");
                assertThrows(java.sql.SQLException.class, insert::executeUpdate);
            }
        }
    }
}
