ALTER TABLE app_users ADD COLUMN credential_version BIGINT NOT NULL DEFAULT 0;
CREATE TABLE password_resets (
    token_hash VARCHAR(64) PRIMARY KEY,
    account_id BIGINT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    CONSTRAINT fk_reset_account FOREIGN KEY (account_id) REFERENCES app_users(id)
);
CREATE INDEX ix_reset_account ON password_resets(account_id);
