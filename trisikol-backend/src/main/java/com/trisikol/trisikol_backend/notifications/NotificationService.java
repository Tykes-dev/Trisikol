package com.trisikol.trisikol_backend.notifications;

import java.time.Instant;
import java.util.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service @Transactional
public class NotificationService {
    private final NotificationRepository repository;
    public NotificationService(NotificationRepository repository) { this.repository = repository; }
    public record View(Long id, Long rideId, String title, String message, Instant createdAt, Instant readAt) {
        static View of(Notification n) { return new View(n.id, n.rideId, n.title, n.message, n.createdAt, n.readAt); }
    }
    public record Inbox(long unreadCount, List<View> items) {}
    public void record(Long recipient, Long ride, Long event, String title, String message, Instant at) {
        repository.save(new Notification(recipient, ride, event, title, message, at));
    }
    public Inbox inbox(Long recipient) {
        return new Inbox(repository.countByRecipientIdAndReadAtIsNull(recipient),
                repository.findByRecipientIdOrderByIdDesc(recipient, PageRequest.of(0, 50)).stream().map(View::of).toList());
    }
    public View read(Long recipient, Long id) {
        var notification = repository.findByIdAndRecipientId(id, recipient)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found."));
        if (notification.readAt == null) notification.readAt = Instant.now();
        return View.of(repository.saveAndFlush(notification));
    }
    public void readAll(Long recipient) { repository.markAll(recipient, Instant.now()); }
}
