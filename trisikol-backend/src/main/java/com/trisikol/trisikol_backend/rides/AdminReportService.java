package com.trisikol.trisikol_backend.rides;

import java.math.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AdminReportService {
    static final ZoneId ZONE = ZoneId.of("Asia/Manila");
    static final int MAX_ROWS = 10000;
    private final CashRepository cash;
    private final RideRepository rides;
    private final QuoteRepository quotes;
    private final TerminalRepository terminals;
    public AdminReportService(CashRepository cash, RideRepository rides, QuoteRepository quotes, TerminalRepository terminals) {
        this.cash = cash; this.rides = rides; this.quotes = quotes; this.terminals = terminals;
    }
    public record Totals(long completedTrips, BigDecimal cashCollected, BigDecimal driverNet,
                         BigDecimal platformFeesDue, BigDecimal discountAmount, BigDecimal distanceKm, BigDecimal averageCashFare) {}
    public record Daily(LocalDate date, Totals totals) {}
    public record ByTerminal(Long terminalId, String terminalName, Totals totals) {}
    public record BySource(String source, Totals totals) {}
    public record TripRow(Long rideId, Long terminalId, String terminalName, Long driverId,
                          String source, String category, Long policyId, Instant cashRecordedAt, Instant completedAt,
                          BigDecimal distanceKm, BigDecimal rawFare, BigDecimal discountAmount,
                          BigDecimal cashCollected, BigDecimal driverNet, BigDecimal platformFeesDue) {}
    public record Report(LocalDate from, LocalDate to, Long terminalId, String terminalName,
                         String timezone, String dateBasis, Instant generatedAt, Totals totals,
                         List<Daily> daily, List<ByTerminal> byTerminal, List<BySource> bySource, List<TripRow> trips) {}

    // One repeatable-read snapshot for bulk records; no global dispatch mutex or row-by-row queries.
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Report get(LocalDate from, LocalDate to, Long terminalId) {
        validateRange(from, to);
        if (terminalId != null && terminalId <= 0) throw bad("Choose a valid TODA or all TODAs.");
        if (terminalId != null && !terminals.existsById(terminalId)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Terminal not found.");
        var entries = cash.findForReport(from.atStartOfDay(ZONE).toInstant(), to.plusDays(1).atStartOfDay(ZONE).toInstant(),
                terminalId, PageRequest.of(0, MAX_ROWS + 1));
        if (entries.size() > MAX_ROWS) throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,
                "This report exceeds 10,000 cash entries. Choose a shorter period or a single TODA; records were not truncated.");
        var rideMap = rides.findAllById(entries.stream().map(entry -> entry.rideId).toList()).stream()
                .collect(Collectors.toMap(ride -> ride.id, Function.identity()));
        var quoteMap = quotes.findAllById(rideMap.values().stream().map(ride -> ride.quoteId).toList()).stream()
                .collect(Collectors.toMap(quote -> quote.id, Function.identity()));
        var terminalMap = terminals.findAllByOrderByIdAsc().stream().collect(Collectors.toMap(Terminal::getId, Function.identity()));
        var total = new Accumulator();
        Map<LocalDate, Accumulator> daily = new LinkedHashMap<>();
        for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) daily.put(day, new Accumulator());
        Map<Long, Accumulator> byTerminal = new TreeMap<>();
        Map<String, Accumulator> bySource = new LinkedHashMap<>();
        bySource.put("APP", new Accumulator()); bySource.put("WALK_IN", new Accumulator());
        List<TripRow> rows = new ArrayList<>();
        for (var entry : entries) {
            var ride = rideMap.get(entry.rideId);
            var quote = ride == null ? null : quoteMap.get(ride.quoteId);
            validateEntry(entry, ride, quote);
            var terminal = terminalMap.get(ride.terminalId);
            if (terminal == null) throw inconsistent();
            var row = new TripRow(ride.id, ride.terminalId, terminal.name, entry.driverId, quote.source, quote.category,
                    quote.policyId, entry.recordedAt, ride.completedAt, quote.distanceKm, quote.rawFare, quote.discountAmount,
                    entry.cashCollected, entry.driverNet, entry.platformDue);
            rows.add(row); total.add(row);
            daily.get(entry.recordedAt.atZone(ZONE).toLocalDate()).add(row);
            byTerminal.computeIfAbsent(ride.terminalId, ignored -> new Accumulator()).add(row);
            bySource.get(quote.source).add(row);
        }
        return new Report(from, to, terminalId, terminalId == null ? "All TODAs" : terminalMap.get(terminalId).name,
                ZONE.getId(), "CASH_RECORDED_AT", Instant.now(), total.view(),
                daily.entrySet().stream().map(item -> new Daily(item.getKey(), item.getValue().view())).toList(),
                byTerminal.entrySet().stream().map(item -> new ByTerminal(item.getKey(), terminalMap.get(item.getKey()).name, item.getValue().view())).toList(),
                bySource.entrySet().stream().map(item -> new BySource(item.getKey(), item.getValue().view())).toList(), List.copyOf(rows));
    }
    static void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null || from.getYear() < 2000 || to.getYear() > 2100 || to.isBefore(from)
                || ChronoUnit.DAYS.between(from, to) >= 93) throw bad("Choose an inclusive period of 1–93 days between years 2000 and 2100.");
    }
    private static void validateEntry(CashEntry entry, Ride ride, FareQuote quote) {
        if (ride == null || quote == null || !"COMPLETED".equals(ride.status) || ride.completedAt == null
                || !Objects.equals(entry.driverId, ride.driverId) || !Objects.equals(quote.terminalId, ride.terminalId)
                || !Set.of("APP", "WALK_IN").contains(quote.source)
                || entry.cashCollected.signum() < 0 || entry.driverNet.signum() < 0 || entry.platformDue.signum() < 0
                || quote.discountAmount.signum() < 0 || quote.distanceKm.signum() <= 0
                || entry.cashCollected.compareTo(entry.driverNet.add(entry.platformDue)) != 0
                || entry.cashCollected.compareTo(quote.totalFare) != 0 || entry.driverNet.compareTo(quote.matrixFare) != 0
                || entry.platformDue.compareTo(quote.serviceFee) != 0
                || quote.rawFare.subtract(quote.discountAmount).compareTo(entry.driverNet) != 0
                || ("WALK_IN".equals(quote.source) && entry.platformDue.signum() != 0)) throw inconsistent();
    }
    private static final class Accumulator {
        long count;
        BigDecimal cash = new BigDecimal("0.00"), net = new BigDecimal("0.00"), due = new BigDecimal("0.00"),
                discount = new BigDecimal("0.00"), distance = new BigDecimal("0.000");
        void add(TripRow row) { count++; cash = cash.add(row.cashCollected); net = net.add(row.driverNet);
            due = due.add(row.platformFeesDue); discount = discount.add(row.discountAmount); distance = distance.add(row.distanceKm); }
        Totals view() { return new Totals(count, cash, net, due, discount, distance,
                count == 0 ? new BigDecimal("0.00") : cash.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP)); }
    }
    private static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private static ResponseStatusException inconsistent() { return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
            "A saved cash entry is inconsistent. This report needs administrator review; no partial totals were returned."); }
}
