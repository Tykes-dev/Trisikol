CREATE TABLE app_users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(11) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    role VARCHAR(16) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_app_users_mobile UNIQUE (mobile),
    CONSTRAINT ck_app_users_role CHECK (role IN ('PASSENGER', 'DRIVER', 'ADMIN'))
);
