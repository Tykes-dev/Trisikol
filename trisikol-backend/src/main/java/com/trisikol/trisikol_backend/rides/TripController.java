package com.trisikol.trisikol_backend.rides;

import com.trisikol.trisikol_backend.auth.*;
import java.security.Principal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api")
public class TripController {
    private final TripService trips;
    private final QuoteService quotes;
    private final AccountService accounts;
    public TripController(TripService trips, QuoteService quotes, AccountService accounts) {
        this.trips = trips; this.quotes = quotes; this.accounts = accounts;
    }
    public record Booking(String quoteId) {}
    private Account user(Principal principal) { return accounts.current(principal.getName()); }
    @GetMapping("/terminals/current") public TripService.TerminalView terminal() { return trips.terminal(); }
    @PutMapping("/admin/terminal") public TripService.TerminalView terminal(@RequestBody TripService.TerminalInput input) { return trips.updateTerminal(input); }
    @GetMapping("/admin/drivers") public List<TripService.DriverView> drivers() { return trips.drivers(); }
    @PutMapping("/admin/drivers/{id}/vehicle") public DriverProfile vehicle(@PathVariable Long id, @RequestBody TripService.VehicleInput input) { return trips.updateDriver(id, input); }
    @PostMapping("/passenger/quotes") @ResponseStatus(HttpStatus.CREATED)
    public QuoteService.View quote(Principal p, @RequestBody QuoteService.Input input) { return quotes.create(user(p), input, "APP"); }
    @PostMapping("/driver/walk-in-quotes") @ResponseStatus(HttpStatus.CREATED)
    public QuoteService.View walkQuote(Principal p, @RequestBody QuoteService.Input input) { return quotes.create(user(p), input, "WALK_IN"); }
    @PostMapping("/passenger/rides") @ResponseStatus(HttpStatus.CREATED)
    public TripService.View book(Principal p, @RequestBody Booking input) { return trips.book(user(p), input.quoteId(), false); }
    @PostMapping("/driver/walk-ins") @ResponseStatus(HttpStatus.CREATED)
    public TripService.View walkIn(Principal p, @RequestBody Booking input) { return trips.book(user(p), input.quoteId(), true); }
    @GetMapping("/passenger/rides") public List<TripService.View> passengerHistory(Principal p) { return trips.passengerRides(user(p)); }
    @GetMapping("/driver/rides") public List<TripService.View> driverHistory(Principal p) { return trips.driverRides(user(p)); }
    @GetMapping("/driver/state") public TripService.DriverState state(Principal p) { return trips.driverState(user(p)); }
    @PostMapping("/driver/queue/join") public TripService.DriverState join(Principal p, @RequestBody(required = false) TripService.Position position) { return trips.join(user(p), position); }
    @PostMapping("/driver/queue/leave") public TripService.DriverState leave(Principal p) { return trips.leave(user(p)); }
    @PostMapping({"/driver/rides/{id}/{action}", "/passenger/rides/{id}/{action}"})
    public TripService.View action(Principal p, @PathVariable Long id, @PathVariable String action) { return trips.transition(user(p), id, action); }
    @GetMapping("/admin/queue") public List<TripService.QueueView> queue() { return trips.queueView(); }
    @GetMapping("/admin/rides") public List<TripService.View> rides() { return trips.adminRides(); }
    @GetMapping("/admin/rides/{id}/events") public List<RideEvent> events(@PathVariable Long id) { return trips.audit(id); }
    @GetMapping("/admin/summary") public TripService.Summary summary() { return trips.summary(); }
}
