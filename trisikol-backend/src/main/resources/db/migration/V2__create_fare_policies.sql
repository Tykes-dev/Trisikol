CREATE TABLE fare_policies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    base_fare DECIMAL(10,2) NOT NULL,
    base_distance_km DECIMAL(10,3) NOT NULL,
    extra_fare_per_km DECIMAL(10,2) NOT NULL,
    app_service_fee_per_km DECIMAL(10,2) NOT NULL,
    change_reason VARCHAR(500) NOT NULL,
    created_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO fare_policies (base_fare, base_distance_km, extra_fare_per_km,
    app_service_fee_per_km, change_reason, created_by)
VALUES (40.00, 1.500, 10.00, 1.00,
    'Initial demo policy; replace with the applicable approved fare schedule.', 'SYSTEM');
