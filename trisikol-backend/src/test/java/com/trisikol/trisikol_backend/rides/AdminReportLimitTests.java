package com.trisikol.trisikol_backend.rides;

import java.time.LocalDate;
import java.util.Collections;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class AdminReportLimitTests {
    @Test void excessiveRowsFailBeforeAnyRecordsAreAggregatedOrTruncated() {
        var cash = mock(CashRepository.class); var rides = mock(RideRepository.class);
        var quotes = mock(QuoteRepository.class); var terminals = mock(TerminalRepository.class);
        when(cash.findForReport(any(), any(), isNull(), any())).thenReturn(Collections.nCopies(10001, new CashEntry()));
        var service = new AdminReportService(cash, rides, quotes, terminals);
        var failure = assertThrows(ResponseStatusException.class, () -> service.get(LocalDate.of(2026, 10, 15), LocalDate.of(2026, 10, 15), null));
        assertEquals(422, failure.getStatusCode().value()); verifyNoInteractions(rides, quotes, terminals);
    }
    @Test void dateLimitIsInclusiveAndAllowsExactly93Days() {
        assertDoesNotThrow(() -> AdminReportService.validateRange(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 4, 3)));
        assertThrows(ResponseStatusException.class, () -> AdminReportService.validateRange(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 4, 4)));
        assertThrows(ResponseStatusException.class, () -> AdminReportService.validateRange(null, LocalDate.now()));
    }
}
