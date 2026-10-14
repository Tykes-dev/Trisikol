package com.trisikol.trisikol_backend.rides;

import com.trisikol.trisikol_backend.auth.Account;
import com.trisikol.trisikol_backend.fare.*;
import java.math.*;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

@Service
public class QuoteService {
    private final QuoteRepository quotes;
    private final FarePolicyRepository policies;
    private final RoadRouting routing;
    private final TerminalRepository terminals;
    private final DriverProfileRepository profiles;
    private final JsonMapper json = JsonMapper.builder().build();
    public QuoteService(QuoteRepository quotes, FarePolicyRepository policies,
            RoadRouting routing, TerminalRepository terminals, DriverProfileRepository profiles) {
        this.quotes = quotes; this.policies = policies; this.routing = routing; this.terminals = terminals;
        this.profiles = profiles;
    }
    public record Input(RoadRouting.Point pickup, RoadRouting.Point dropoff,
            String pickupLabel, String dropoffLabel, String category, Long terminalId) {
        public Input(RoadRouting.Point pickup, RoadRouting.Point dropoff, String pickupLabel, String dropoffLabel, String category) {
            this(pickup, dropoff, pickupLabel, dropoffLabel, category, null);
        }
    }
    public record View(String quoteId, Long policyId, String source, String category,
            RoadRouting.Point pickup, RoadRouting.Point dropoff, String pickupLabel, String dropoffLabel,
            BigDecimal distanceKm, BigDecimal rawFare, BigDecimal discountAmount,
            BigDecimal matrixFare, BigDecimal serviceFee, BigDecimal totalFare,
            Instant expiresAt, List<List<Double>> positions, Long terminalId, String terminalName) {}

    public View create(Account owner, Input input, String source) {
        if (input == null) throw bad("Choose pickup and drop-off locations.");
        Long terminalId = input.terminalId() == null ? 1L : input.terminalId();
        RoadRouting.Point pickup = input.pickup();
        if (source.equals("WALK_IN")) {
            terminalId = profiles.findById(owner.getId()).map(DriverProfile::getTerminalId).orElse(1L);
            if (input.terminalId() != null && !input.terminalId().equals(terminalId)) throw bad("Use your assigned terminal for a walk-in.");
            var terminal = terminals.findById(terminalId).orElseThrow();
            pickup = new RoadRouting.Point(terminal.latitude.doubleValue(), terminal.longitude.doubleValue());
        }
        var terminal = terminals.findById(terminalId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Terminal not found."));
        validate(pickup); validate(input.dropoff());
        if (pickup.equals(input.dropoff())) throw bad("Choose different pickup and drop-off locations.");
        String category = input.category() == null ? "REGULAR" : input.category();
        if (!Set.of("REGULAR", "STUDENT", "SENIOR", "PWD").contains(category)) throw bad("Choose a valid passenger category.");
        String pickupLabel = source.equals("WALK_IN") ? "Terminal walk-in" : label(input.pickupLabel(), "Pinned pickup");
        String dropoffLabel = label(input.dropoffLabel(), "Pinned drop-off");
        // Network I/O happens before dispatch locks. Prices/distance never come from the browser.
        var route = routing.route(pickup, input.dropoff());
        var policy = policies.findFirstByTerminalIdOrderByIdDesc(terminal.getId()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Fare settings are unavailable."));
        BigDecimal distance = route.distanceKm();
        BigDecimal extraKm = distance.subtract(policy.getBaseDistanceKm()).max(BigDecimal.ZERO)
                .setScale(0, RoundingMode.CEILING);
        BigDecimal raw = policy.getBaseFare().add(extraKm.multiply(policy.getExtraFarePerKm())).setScale(2);
        BigDecimal discount = category.equals("REGULAR") ? BigDecimal.ZERO.setScale(2)
                : raw.multiply(new BigDecimal("0.20")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal fee = source.equals("WALK_IN") ? BigDecimal.ZERO.setScale(2)
                : distance.setScale(0, RoundingMode.CEILING).multiply(policy.getAppServiceFeePerKm()).setScale(2);
        FareQuote quote = new FareQuote();
        quote.id = UUID.randomUUID().toString(); quote.ownerId = owner.getId(); quote.source = source;
        quote.terminalId = terminalId;
        quote.category = category; quote.policyId = policy.getId();
        quote.pickupLat = pickup.lat(); quote.pickupLng = pickup.lng();
        quote.dropoffLat = input.dropoff().lat(); quote.dropoffLng = input.dropoff().lng();
        quote.pickupLabel = pickupLabel;
        quote.dropoffLabel = dropoffLabel;
        quote.distanceKm = distance; quote.rawFare = raw; quote.discountAmount = discount;
        quote.matrixFare = raw.subtract(discount); quote.serviceFee = fee;
        quote.totalFare = quote.matrixFare.add(fee); quote.routeJson = json.writeValueAsString(route.positions());
        quote.createdAt = Instant.now(); quote.expiresAt = quote.createdAt.plusSeconds(300);
        return view(quotes.saveAndFlush(quote));
    }
    public FareQuote owned(String id, Account owner, String source) {
        if (id == null) throw bad("Request a fare quote first.");
        var quote = quotes.findById(id).orElseThrow(() -> bad("Fare quote not found."));
        if (!quote.ownerId.equals(owner.getId()) || !quote.source.equals(source)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Fare quote not found.");
        }
        return quote;
    }
    public View view(FareQuote quote) {
        List<List<Double>> positions = new ArrayList<>();
        for (var point : json.readTree(quote.routeJson)) positions.add(List.of(point.get(0).asDouble(), point.get(1).asDouble()));
        return new View(quote.id, quote.policyId, quote.source, quote.category,
                new RoadRouting.Point(quote.pickupLat, quote.pickupLng), new RoadRouting.Point(quote.dropoffLat, quote.dropoffLng),
                quote.pickupLabel, quote.dropoffLabel, quote.distanceKm, quote.rawFare, quote.discountAmount,
                quote.matrixFare, quote.serviceFee, quote.totalFare, quote.expiresAt, positions, quote.terminalId,
                terminals.findById(quote.terminalId).orElseThrow().getName());
    }
    private static void validate(RoadRouting.Point point) {
        if (point == null || !Double.isFinite(point.lat()) || !Double.isFinite(point.lng())
                || Math.abs(point.lat()) > 90 || Math.abs(point.lng()) > 180) throw bad("Choose valid map locations.");
    }
    private static String label(String label, String fallback) {
        if (label == null || label.isBlank()) return fallback;
        if (label.strip().length() > 150) throw bad("Location labels must be at most 150 characters.");
        return label.strip();
    }
    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
