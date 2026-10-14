package com.trisikol.trisikol_backend.notifications;

import com.trisikol.trisikol_backend.auth.AccountService;
import java.security.Principal;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService notifications;
    private final AccountService accounts;
    public NotificationController(NotificationService notifications, AccountService accounts) {
        this.notifications = notifications; this.accounts = accounts;
    }
    @GetMapping public NotificationService.Inbox inbox(Principal p) { return notifications.inbox(accounts.current(p.getName()).getId()); }
    @PostMapping("/{id}/read") public NotificationService.View read(Principal p, @PathVariable Long id) {
        return notifications.read(accounts.current(p.getName()).getId(), id);
    }
    @PostMapping("/read-all") @ResponseStatus(HttpStatus.NO_CONTENT) public void readAll(Principal p) {
        notifications.readAll(accounts.current(p.getName()).getId());
    }
}
