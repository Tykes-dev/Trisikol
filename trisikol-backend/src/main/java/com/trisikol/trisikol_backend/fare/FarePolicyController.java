package com.trisikol.trisikol_backend.fare;

import java.math.BigDecimal;
import java.security.Principal;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import com.trisikol.trisikol_backend.rides.TerminalRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class FarePolicyController {
    private final FarePolicyRepository policies;
    private final TerminalRepository terminals;
    public FarePolicyController(FarePolicyRepository policies, TerminalRepository terminals) { this.policies = policies; this.terminals = terminals; }

    public record PolicyInput(BigDecimal baseFare, BigDecimal baseDistanceKm,
            BigDecimal extraFarePerKm, BigDecimal appServiceFeePerKm, String changeReason, Long terminalId) {}
    public record FareSettings(Long policyId, BigDecimal baseFare, BigDecimal baseDistanceKm,
            BigDecimal extraFarePerKm, BigDecimal appServiceFeePerKm, Long terminalId) {}

    @GetMapping("/fares/current")
    public FareSettings current(@RequestParam(defaultValue = "1") Long terminalId) {
        requireTerminal(terminalId);
        var policy = policies.findFirstByTerminalIdOrderByIdDesc(terminalId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Fare settings are unavailable."));
        return new FareSettings(policy.getId(), policy.getBaseFare(), policy.getBaseDistanceKm(),
                policy.getExtraFarePerKm(), policy.getAppServiceFeePerKm(), terminalId);
    }

    @GetMapping("/admin/fare-policies")
    public List<FarePolicy> history(@RequestParam(defaultValue = "1") Long terminalId) {
        requireTerminal(terminalId);
        return policies.findByTerminalIdOrderByIdDesc(terminalId, PageRequest.of(0, 50));
    }

    @PostMapping("/admin/fare-policies")
    @ResponseStatus(HttpStatus.CREATED)
    public FarePolicy create(@RequestBody PolicyInput input, Principal principal) {
        Long terminalId = input.terminalId() == null ? 1L : input.terminalId(); requireTerminal(terminalId);
        validate(input.baseFare(), "Base fare", "0", "10000", 2);
        validate(input.baseDistanceKm(), "Base distance", "0.001", "1000", 3);
        validate(input.extraFarePerKm(), "Extra fare", "0", "10000", 2);
        validate(input.appServiceFeePerKm(), "Service fee", "0", "10000", 2);
        String reason = input.changeReason() == null ? "" : input.changeReason().strip();
        if (reason.length() < 10 || reason.length() > 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Provide a change reason of 10–500 characters.");
        }
        return policies.saveAndFlush(new FarePolicy(input.baseFare(), input.baseDistanceKm(),
                input.extraFarePerKm(), input.appServiceFeePerKm(), reason, principal.getName()).forTerminal(terminalId));
    }

    private void requireTerminal(Long id) {
        if (id == null || !terminals.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Terminal not found.");
    }

    private static void validate(BigDecimal value, String label, String minimum, String maximum, int decimals) {
        if (value == null || value.compareTo(new BigDecimal(minimum)) < 0
                || value.compareTo(new BigDecimal(maximum)) > 0
                || value.stripTrailingZeros().scale() > decimals) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    label + " must be between " + minimum + " and " + maximum
                            + ", with at most " + decimals + " decimal places.");
        }
    }
}
