package com.trisikol.trisikol_backend.rides;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/passenger/terminal-suggestions")
public class TerminalDiscoveryController {
    private final TerminalDiscoveryService discovery;
    public TerminalDiscoveryController(TerminalDiscoveryService discovery) { this.discovery = discovery; }

    // POST keeps the pickup out of URL/history/query-string logs; normal session CSRF applies.
    @PostMapping
    public TerminalDiscoveryService.Result suggest(@RequestBody TerminalDiscoveryService.Input input) {
        return discovery.suggest(input);
    }
}
