package com.trisikol.trisikol_backend.auth;

import java.util.Map;
import java.sql.SQLException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<?> conflict(DataIntegrityViolationException error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (cause instanceof SQLException sql &&
                    ("23505".equals(sql.getSQLState()) ||
                     ("23000".equals(sql.getSQLState()) && sql.getErrorCode() == 1062))) {
                return ResponseEntity.status(409).body(Map.of("message", "Unable to create account with these details. Try signing in."));
            }
        }
        return ResponseEntity.internalServerError().body(Map.of("message",
                "We couldn't save your account because of a server error. Please try again later."));
    }
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> invalid(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode()).body(Map.of("message", error.getReason() == null ? "Request rejected." : error.getReason()));
    }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<?> malformed() {
        return ResponseEntity.badRequest().body(Map.of("message", "Invalid request body."));
    }
}
