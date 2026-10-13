package com.trisikol.trisikol_backend.rides;

import com.trisikol.trisikol_backend.auth.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(noRollbackFor = ResponseStatusException.class)
public class TripService {
    static final List<String> ACTIVE = List.of("REQUESTED", "OFFERED", "ACCEPTED", "IN_PROGRESS");
    private final TerminalRepository terminals;
    private final DriverProfileRepository profiles;
    private final QueueRepository queue;
    private final RideRepository rides;
    private final QuoteRepository quotes;
    private final QuoteService prices;
    private final EventRepository events;
    private final CashRepository cash;
    private final AccountRepository accounts;
    private final boolean requireLocation;
    public TripService(TerminalRepository terminals, DriverProfileRepository profiles, QueueRepository queue,
            RideRepository rides, QuoteRepository quotes, QuoteService prices, EventRepository events,
            CashRepository cash, AccountRepository accounts,
            @Value("${trisikol.dispatch.require-location:true}") boolean requireLocation) {
        this.terminals = terminals; this.profiles = profiles; this.queue = queue; this.rides = rides;
        this.quotes = quotes; this.prices = prices; this.events = events; this.cash = cash;
        this.accounts = accounts; this.requireLocation = requireLocation;
    }
    public record Person(Long id, String name) {}
    public record View(Long id, String status, Person passenger, Person driver, QuoteService.View fare,
            Instant createdAt, Instant updatedAt, Instant offerExpiresAt, Instant completedAt) {}
    public record QueueView(int position, Long driverId, String name, String bodyNumber, Instant joinedAt) {}
    public record TerminalView(Long id, String name, BigDecimal latitude, BigDecimal longitude, boolean locationRequired) {}
    public record DriverView(AccountService.View account, DriverProfile vehicle) {}
    public record DriverState(DriverProfile vehicle, Integer position, View activeRide,
            BigDecimal cashCollected, BigDecimal netEarnings, BigDecimal platformDue, List<CashEntry> ledger) {}
    public record Position(Double latitude, Double longitude, Double accuracy, Instant capturedAt) {}
    public record VehicleInput(boolean enabled, String bodyNumber, String plateNumber, String vehicleModel) {}
    public record TerminalInput(String name, BigDecimal latitude, BigDecimal longitude) {}
    public record Summary(long rides, long completed, int queuedDrivers,
            BigDecimal cashCollected, BigDecimal driverNet, BigDecimal platformDue) {}

    public TerminalView terminal() {
        var terminal = terminals.findById(1L).orElseThrow();
        return new TerminalView(terminal.id, terminal.name, terminal.latitude, terminal.longitude, requireLocation);
    }
    public TerminalView updateTerminal(TerminalInput input) {
        terminals.lockDispatch();
        if (!active().isEmpty() || queue.count() > 0) throw conflict("Finish active trips and clear the queue before changing the terminal.");
        if (input == null || input.name() == null || input.name().isBlank() || input.name().strip().length() > 100
                || input.latitude() == null || input.longitude() == null
                || input.latitude().abs().compareTo(new BigDecimal("90")) > 0
                || input.longitude().abs().compareTo(new BigDecimal("180")) > 0
                || input.latitude().stripTrailingZeros().scale() > 7 || input.longitude().stripTrailingZeros().scale() > 7) {
            throw bad("Use a terminal name and valid coordinates with at most seven decimal places.");
        }
        var terminal = terminals.findById(1L).orElseThrow();
        terminal.name = input.name().strip(); terminal.latitude = input.latitude(); terminal.longitude = input.longitude();
        terminals.saveAndFlush(terminal); return terminal();
    }
    public List<DriverView> drivers() {
        terminals.lockDispatch();
        return accounts.findByRoleOrderByIdAsc(Account.Role.DRIVER).stream()
                .map(a -> new DriverView(AccountService.View.of(a), profile(a.getId()))).toList();
    }
    public DriverProfile updateDriver(Long id, VehicleInput input) {
        terminals.lockDispatch(); settle();
        var account = accounts.findById(id).filter(a -> a.getRole() == Account.Role.DRIVER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver not found."));
        if (input == null) throw bad("Provide vehicle details.");
        String body = text(input.bodyNumber(), 30), plate = text(input.plateNumber(), 30), model = text(input.vehicleModel(), 100);
        if (!input.enabled() && active().stream().anyMatch(r -> id.equals(r.driverId))) {
            throw conflict("Finish or cancel the driver's active trip before suspending them.");
        }
        var profile = profile(account.getId());
        profile.enabled = input.enabled(); profile.bodyNumber = body; profile.plateNumber = plate; profile.vehicleModel = model;
        profiles.saveAndFlush(profile);
        if (!profile.enabled) queue.findByDriverId(id).ifPresent(queue::delete);
        queue.flush(); dispatch(); return profile;
    }
    public DriverState driverState(Account driver) {
        terminals.lockDispatch(); settle();
        var waiting = queue.findAllByOrderByIdAsc(); Integer position = null;
        for (int i = 0; i < waiting.size(); i++) if (waiting.get(i).driverId.equals(driver.getId())) position = i + 1;
        var entries = cash.findByDriverIdOrderByIdDesc(driver.getId());
        return new DriverState(profile(driver.getId()), position,
                active().stream().filter(r -> driver.getId().equals(r.driverId)).findFirst().map(this::view).orElse(null),
                sum(entries, "cash"), sum(entries, "net"), sum(entries, "due"), entries.stream().limit(50).toList());
    }
    public DriverState join(Account driver, Position position) {
        var terminal = terminals.lockDispatch(); settle();
        eligible(driver.getId());
        if (active().stream().anyMatch(r -> driver.getId().equals(r.driverId))) throw conflict("You already have an active trip.");
        if (requireLocation) validatePosition(position, terminal);
        if (queue.findByDriverId(driver.getId()).isEmpty()) queue.saveAndFlush(new QueueEntry(driver.getId()));
        dispatch(); return driverState(driver);
    }
    public DriverState leave(Account driver) {
        terminals.lockDispatch(); settle();
        if (active().stream().anyMatch(r -> driver.getId().equals(r.driverId))) throw conflict("Handle your active trip before leaving.");
        queue.findByDriverId(driver.getId()).ifPresent(queue::delete); queue.flush(); return driverState(driver);
    }
    public View book(Account owner, String quoteId, boolean walkIn) {
        terminals.lockDispatch(); settle();
        var quote = prices.owned(quoteId, owner, walkIn ? "WALK_IN" : "APP");
        var previous = rides.findByQuoteId(quote.id);
        if (previous.isPresent()) return view(previous.get()); // Same quote is the idempotency key.
        if (!quote.expiresAt.isAfter(Instant.now())) throw conflict("Your quote expired. Request a new quote.");
        if (walkIn) {
            var terminal = terminals.findById(1L).orElseThrow();
            if (quote.pickupLat != terminal.latitude.doubleValue() || quote.pickupLng != terminal.longitude.doubleValue()) {
                throw conflict("The terminal moved. Request a new walk-in quote.");
            }
            eligible(owner.getId());
            if (active().stream().anyMatch(r -> owner.getId().equals(r.driverId))) throw conflict("You already have an active trip.");
            var head = queue.findAllByOrderByIdAsc();
            if (head.isEmpty() || !head.get(0).driverId.equals(owner.getId())) {
                throw conflict("Join the queue and wait until you are first to take a walk-in.");
            }
            queue.delete(head.get(0)); queue.flush();
        } else if (active().stream().anyMatch(r -> owner.getId().equals(r.passengerId))) {
            throw conflict("You already have an active booking.");
        }
        Ride ride = new Ride(); ride.quoteId = quote.id;
        ride.passengerId = walkIn ? null : owner.getId(); ride.driverId = walkIn ? owner.getId() : null;
        ride.status = walkIn ? "ACCEPTED" : "REQUESTED";
        ride.createdAt = Instant.now(); ride.updatedAt = ride.createdAt;
        rides.saveAndFlush(ride); events.save(new RideEvent(ride, owner.getMobile())); dispatch();
        return view(ride);
    }
    public List<View> passengerRides(Account passenger) {
        terminals.lockDispatch(); settle();
        return rides.findByPassengerIdOrderByIdDesc(passenger.getId(), PageRequest.of(0, 100)).stream().map(this::view).toList();
    }
    public List<View> driverRides(Account driver) {
        terminals.lockDispatch(); settle();
        return rides.findByDriverIdOrderByIdDesc(driver.getId(), PageRequest.of(0, 100)).stream().map(this::view).toList();
    }
    public View transition(Account actor, Long id, String action) {
        terminals.lockDispatch(); settle();
        var ride = rides.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ride not found."));
        boolean driver = actor.getRole() == Account.Role.DRIVER && actor.getId().equals(ride.driverId);
        boolean passenger = actor.getRole() == Account.Role.PASSENGER && actor.getId().equals(ride.passengerId);
        if (!driver && !passenger) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ride not found.");
        if (action.equals("cancel")) {
            if (ride.status.equals("CANCELLED")) return view(ride);
            if (!List.of("REQUESTED", "OFFERED", "ACCEPTED").contains(ride.status)) throw conflict("This trip can no longer be cancelled.");
            change(ride, "CANCELLED", actor.getMobile());
        } else {
            if (!driver) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the assigned driver can perform this action.");
            switch (action) {
                case "accept" -> {
                    if (ride.status.equals("ACCEPTED")) return view(ride);
                    require(ride, "OFFERED"); change(ride, "ACCEPTED", actor.getMobile());
                }
                case "decline" -> {
                    require(ride, "OFFERED"); ride.driverId = null; change(ride, "REQUESTED", actor.getMobile());
                }
                case "start" -> {
                    if (ride.status.equals("IN_PROGRESS")) return view(ride);
                    require(ride, "ACCEPTED"); change(ride, "IN_PROGRESS", actor.getMobile());
                }
                case "complete" -> {
                    if (ride.status.equals("COMPLETED")) return view(ride);
                    require(ride, "IN_PROGRESS"); ride.completedAt = Instant.now();
                    cash.saveAndFlush(new CashEntry(ride, quotes.findById(ride.quoteId).orElseThrow()));
                    change(ride, "COMPLETED", actor.getMobile());
                }
                default -> throw bad("Unknown ride action.");
            }
        }
        dispatch(); return view(ride);
    }
    public List<QueueView> queueView() {
        terminals.lockDispatch(); settle();
        List<QueueView> result = new ArrayList<>();
        for (var entry : queue.findAllByOrderByIdAsc()) {
            var driver = accounts.findById(entry.driverId).orElseThrow();
            result.add(new QueueView(result.size() + 1, driver.getId(), driver.getName(), profile(driver.getId()).bodyNumber, entry.joinedAt));
        }
        return result;
    }
    public List<View> adminRides() {
        terminals.lockDispatch(); settle();
        return rides.findAll(PageRequest.of(0, 100, Sort.by("id").descending())).stream().map(this::view).toList();
    }
    public Summary summary() {
        terminals.lockDispatch(); settle();
        return new Summary(rides.count(), cash.count(), (int) queue.count(), cash.totalCash(), cash.totalDriverNet(), cash.totalPlatformDue());
    }
    public List<RideEvent> audit(Long id) {
        if (!rides.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ride not found.");
        return events.findByRideIdOrderByIdAsc(id);
    }
    private List<Ride> active() { return rides.findByStatusInOrderByIdAsc(ACTIVE); }
    private void settle() {
        Instant now = Instant.now();
        for (var ride : active()) {
            if (List.of("REQUESTED", "OFFERED").contains(ride.status) && ride.createdAt.plusSeconds(900).isBefore(now)) {
                change(ride, "CANCELLED", "SYSTEM_TIMEOUT");
            } else if (ride.status.equals("OFFERED") && ride.offerExpiresAt != null && !ride.offerExpiresAt.isAfter(now)) {
                ride.driverId = null; change(ride, "REQUESTED", "SYSTEM_OFFER_EXPIRED");
            }
        }
        dispatch();
    }
    private void dispatch() {
        var waiting = new ArrayList<>(queue.findAllByOrderByIdAsc());
        for (var ride : rides.findByStatusInOrderByIdAsc(List.of("REQUESTED"))) {
            while (!waiting.isEmpty()) {
                var entry = waiting.remove(0); queue.delete(entry); queue.flush();
                if (!profile(entry.driverId).enabled || active().stream().anyMatch(r -> entry.driverId.equals(r.driverId))) continue;
                ride.driverId = entry.driverId; change(ride, "OFFERED", "SYSTEM_DISPATCH");
                ride.offerExpiresAt = Instant.now().plusSeconds(60); rides.save(ride); break;
            }
        }
    }
    private void change(Ride ride, String status, String actor) {
        ride.status = status; ride.updatedAt = Instant.now(); ride.offerExpiresAt = null;
        rides.saveAndFlush(ride); events.save(new RideEvent(ride, actor));
    }
    private View view(Ride ride) {
        return new View(ride.id, ride.status, person(ride.passengerId), person(ride.driverId),
                prices.view(quotes.findById(ride.quoteId).orElseThrow()), ride.createdAt,
                ride.updatedAt, ride.offerExpiresAt, ride.completedAt);
    }
    private Person person(Long id) {
        if (id == null) return null;
        var account = accounts.findById(id).orElseThrow(); return new Person(account.getId(), account.getName());
    }
    private DriverProfile profile(Long id) { return profiles.findById(id).orElseGet(() -> profiles.saveAndFlush(new DriverProfile(id))); }
    private void eligible(Long id) {
        var profile = profile(id);
        if (!profile.enabled) throw conflict("Your driver account is suspended. Contact your administrator.");
        if (profile.bodyNumber.isBlank() || profile.plateNumber.isBlank() || profile.vehicleModel.isBlank()) {
            throw conflict("Ask your administrator to register your vehicle before joining the queue.");
        }
    }
    private static void require(Ride ride, String status) {
        if (!ride.status.equals(status)) throw conflict("The ride status changed. Refresh before continuing.");
    }
    private static String text(String value, int max) {
        if (value == null || value.isBlank() || value.strip().length() > max) throw bad("Provide valid body number, plate number, and vehicle model.");
        return value.strip();
    }
    private static BigDecimal sum(List<CashEntry> entries, String field) {
        return entries.stream().map(e -> field.equals("cash") ? e.cashCollected : field.equals("net") ? e.driverNet : e.platformDue)
                .reduce(BigDecimal.ZERO.setScale(2), BigDecimal::add);
    }
    private static void validatePosition(Position p, Terminal t) {
        Instant now = Instant.now();
        if (p == null || p.latitude() == null || p.longitude() == null || p.accuracy() == null || p.capturedAt() == null
                || !Double.isFinite(p.latitude()) || !Double.isFinite(p.longitude()) || !Double.isFinite(p.accuracy())
                || Math.abs(p.latitude()) > 90 || Math.abs(p.longitude()) > 180 || p.accuracy() < 0 || p.accuracy() > 50
                || p.capturedAt().isBefore(now.minusSeconds(30)) || p.capturedAt().isAfter(now.plusSeconds(5))) {
            throw bad("Use a fresh GPS reading with accuracy within 50 metres.");
        }
        double lat1 = Math.toRadians(p.latitude()), lat2 = Math.toRadians(t.latitude.doubleValue());
        double dl = Math.toRadians(p.longitude() - t.longitude.doubleValue());
        double a = Math.pow(Math.sin((lat1 - lat2) / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dl / 2), 2);
        if (6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) > 100) throw bad("You must be within 100 metres of the terminal.");
    }
    private static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private static ResponseStatusException conflict(String message) { return new ResponseStatusException(HttpStatus.CONFLICT, message); }
}
