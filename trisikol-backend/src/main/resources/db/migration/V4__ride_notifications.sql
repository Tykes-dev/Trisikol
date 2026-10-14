CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_id BIGINT NOT NULL,
    ride_id BIGINT NOT NULL,
    event_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    message VARCHAR(300) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    read_at TIMESTAMP,
    UNIQUE (recipient_id, event_id),
    FOREIGN KEY (recipient_id) REFERENCES app_users(id),
    FOREIGN KEY (ride_id) REFERENCES rides(id),
    FOREIGN KEY (event_id) REFERENCES ride_events(id)
);
CREATE INDEX ix_notifications_recipient ON notifications(recipient_id, read_at, id);
