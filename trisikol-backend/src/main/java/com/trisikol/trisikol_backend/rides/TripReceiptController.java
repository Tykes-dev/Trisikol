package com.trisikol.trisikol_backend.rides;

import com.trisikol.trisikol_backend.auth.AccountService;
import java.security.Principal;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class TripReceiptController {
    private final TripReceiptService receipts;
    private final AccountService accounts;
    public TripReceiptController(TripReceiptService receipts, AccountService accounts) { this.receipts = receipts; this.accounts = accounts; }
    @GetMapping({"/passenger/rides/{id}/receipt", "/driver/rides/{id}/receipt", "/admin/rides/{id}/receipt"})
    public ResponseEntity<TripReceiptService.Receipt> receipt(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("Pragma", "no-cache")
                .body(receipts.get(accounts.current(principal.getName()), id));
    }
}
