package com.trisikol.trisikol_backend.rides;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/reports")
public class AdminReportController {
    private final AdminReportService reports;
    public AdminReportController(AdminReportService reports) { this.reports = reports; }
    @GetMapping
    public ResponseEntity<AdminReportService.Report> report(@RequestParam String from, @RequestParam String to,
                                                           @RequestParam(required = false) Long terminalId) {
        try {
            return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("Pragma", "no-cache")
                    .body(reports.get(LocalDate.parse(from), LocalDate.parse(to), terminalId));
        } catch (DateTimeParseException invalid) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use valid dates in YYYY-MM-DD format.");
        }
    }
}
