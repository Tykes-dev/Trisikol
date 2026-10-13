package com.trisikol.trisikol_backend.auth;

import java.sql.SQLException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import static org.junit.jupiter.api.Assertions.*;

class ApiErrorsTests {
    private final ApiErrors errors = new ApiErrors();

    @Test void duplicateKeysAreConflictsForBothDatabases() {
        for (var sql : new SQLException[] {
                new SQLException("duplicate", "23505"),
                new SQLException("duplicate", "23000", 1062) }) {
            assertEquals(409, errors.conflict(new DataIntegrityViolationException("insert", sql))
                    .getStatusCode().value());
        }
    }

    @Test void otherConstraintFailuresAreNotReportedAsDuplicateAccounts() {
        var response = errors.conflict(new DataIntegrityViolationException("insert",
                new SQLException("private database details", "23514")));
        assertEquals(500, response.getStatusCode().value());
        assertFalse(response.getBody().toString().contains("Try signing in"));
        assertFalse(response.getBody().toString().contains("private database details"));
    }
}
