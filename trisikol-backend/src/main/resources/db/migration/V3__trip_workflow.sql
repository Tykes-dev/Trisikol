CREATE TABLE terminals (
    id BIGINT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL
);
INSERT INTO terminals VALUES (1, 'Demo TODA Terminal', 15.2155, 120.5487);

CREATE TABLE driver_profiles (
    account_id BIGINT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    body_number VARCHAR(30) NOT NULL DEFAULT '',
    plate_number VARCHAR(30) NOT NULL DEFAULT '',
    vehicle_model VARCHAR(100) NOT NULL DEFAULT '',
    FOREIGN KEY (account_id) REFERENCES app_users(id)
);
INSERT INTO driver_profiles (account_id) SELECT id FROM app_users WHERE role = 'DRIVER';

CREATE TABLE queue_entries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    driver_id BIGINT NOT NULL UNIQUE,
    joined_at TIMESTAMP NOT NULL,
    FOREIGN KEY (driver_id) REFERENCES app_users(id)
);

CREATE TABLE fare_quotes (
    id VARCHAR(36) PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    source VARCHAR(16) NOT NULL,
    category VARCHAR(16) NOT NULL,
    policy_id BIGINT NOT NULL,
    pickup_lat DOUBLE PRECISION NOT NULL,
    pickup_lng DOUBLE PRECISION NOT NULL,
    dropoff_lat DOUBLE PRECISION NOT NULL,
    dropoff_lng DOUBLE PRECISION NOT NULL,
    pickup_label VARCHAR(150) NOT NULL,
    dropoff_label VARCHAR(150) NOT NULL,
    distance_km DECIMAL(10,3) NOT NULL,
    raw_fare DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    matrix_fare DECIMAL(10,2) NOT NULL,
    service_fee DECIMAL(10,2) NOT NULL,
    total_fare DECIMAL(10,2) NOT NULL,
    route_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES app_users(id),
    FOREIGN KEY (policy_id) REFERENCES fare_policies(id)
);

CREATE TABLE rides (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quote_id VARCHAR(36) NOT NULL UNIQUE,
    passenger_id BIGINT,
    driver_id BIGINT,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    offer_expires_at TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (quote_id) REFERENCES fare_quotes(id),
    FOREIGN KEY (passenger_id) REFERENCES app_users(id),
    FOREIGN KEY (driver_id) REFERENCES app_users(id)
);
CREATE INDEX ix_rides_passenger ON rides(passenger_id, status);
CREATE INDEX ix_rides_driver ON rides(driver_id, status);

CREATE TABLE ride_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ride_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    actor VARCHAR(50) NOT NULL,
    occurred_at TIMESTAMP NOT NULL,
    FOREIGN KEY (ride_id) REFERENCES rides(id)
);

CREATE TABLE cash_ledger (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ride_id BIGINT NOT NULL UNIQUE,
    driver_id BIGINT NOT NULL,
    cash_collected DECIMAL(10,2) NOT NULL,
    driver_net DECIMAL(10,2) NOT NULL,
    platform_due DECIMAL(10,2) NOT NULL,
    recorded_at TIMESTAMP NOT NULL,
    FOREIGN KEY (ride_id) REFERENCES rides(id),
    FOREIGN KEY (driver_id) REFERENCES app_users(id)
);
