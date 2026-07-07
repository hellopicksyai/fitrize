-- ============================================================
-- FITRAZE / BitFits — Admin foundation migration
-- Run ONCE in phpMyAdmin: bitfits → SQL tab → paste → Go
-- Safe: additive only. Existing data untouched.
-- ============================================================

-- 1) Add admin flag + suspended flag to users (only if not already present).
--    If a column already exists, MySQL errors — so we guard with a check.
--    Simplest: run these; if one errors "Duplicate column", it's already there — ignore it.
ALTER TABLE users ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN suspended TINYINT(1) NOT NULL DEFAULT 0;

-- 2) Admin audit log — records admin actions for accountability.
CREATE TABLE IF NOT EXISTS admin_logs (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  admin_id    CHAR(36)     NOT NULL,
  admin_name  VARCHAR(255) NULL,
  action      VARCHAR(128) NOT NULL,
  target      VARCHAR(255) NULL,
  details     TEXT         NULL,
  created_at  VARCHAR(40)  NOT NULL,
  INDEX idx_adminlogs_admin (admin_id),
  INDEX idx_adminlogs_created (created_at)
) ENGINE=InnoDB;

-- 3) Make yourself an admin. REPLACE the email with YOUR account's email.
UPDATE users SET is_admin = 1 WHERE email = 'your-email@example.com';
