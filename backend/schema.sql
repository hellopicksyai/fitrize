-- BitFits MySQL schema (ported from MongoDB collections)
-- Run once:  mysql -u root -p < schema.sql   (or use `npm run init-db`)

CREATE DATABASE IF NOT EXISTS bitfits
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bitfits;

-- users (Mongo: db.users) ----------------------------------------------------
-- Flexible Mongo fields (profile) stored as JSON.
CREATE TABLE IF NOT EXISTS users (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL,
  password    VARCHAR(255) NOT NULL,
  xp          INT          NOT NULL DEFAULT 0,
  streak      INT          NOT NULL DEFAULT 0,
  level       INT          NOT NULL DEFAULT 1,
  tier        VARCHAR(32)  NOT NULL DEFAULT 'pro',
  onboarded   TINYINT(1)   NOT NULL DEFAULT 0,
  profile     JSON         NULL,
  tier_since  VARCHAR(40)  NULL,
  created_at  VARCHAR(40)  NOT NULL,
  updated_at  VARCHAR(40)  NULL
) ENGINE=InnoDB;

-- meals (Mongo: db.meals) -----------------------------------------------------
CREATE TABLE IF NOT EXISTS meals (
  id         CHAR(36)     NOT NULL PRIMARY KEY,
  user_id    CHAR(36)     NOT NULL,
  name       VARCHAR(255) NOT NULL,
  calories   DOUBLE       NOT NULL DEFAULT 0,
  protein    DOUBLE       NOT NULL DEFAULT 0,
  carbs      DOUBLE       NOT NULL DEFAULT 0,
  fats       DOUBLE       NOT NULL DEFAULT 0,
  fiber      DOUBLE       NOT NULL DEFAULT 0,
  sugar      DOUBLE       NOT NULL DEFAULT 0,
  meal_type  VARCHAR(32)  NOT NULL DEFAULT 'snack',
  date       VARCHAR(12)  NOT NULL,
  created_at VARCHAR(40)  NOT NULL,
  INDEX idx_meals_user_date (user_id, date)
) ENGINE=InnoDB;

-- water (Mongo: db.water) -----------------------------------------------------
CREATE TABLE IF NOT EXISTS water (
  id         CHAR(36)    NOT NULL PRIMARY KEY,
  user_id    CHAR(36)    NOT NULL,
  date       VARCHAR(12) NOT NULL,
  glasses    INT         NOT NULL DEFAULT 0,
  updated_at VARCHAR(40) NULL,
  UNIQUE KEY uq_water_user_date (user_id, date)
) ENGINE=InnoDB;

-- meal_plans (Mongo: db.meal_plans) ------------------------------------------
CREATE TABLE IF NOT EXISTS meal_plans (
  id         CHAR(36)    NOT NULL PRIMARY KEY,
  user_id    CHAR(36)    NOT NULL,
  plan       JSON        NULL,
  diet       VARCHAR(32) NULL,
  created_at VARCHAR(40) NOT NULL,
  INDEX idx_mealplans_user (user_id)
) ENGINE=InnoDB;

-- workouts (Mongo: db.workouts) ----------------------------------------------
CREATE TABLE IF NOT EXISTS workouts (
  id         CHAR(36)    NOT NULL PRIMARY KEY,
  user_id    CHAR(36)    NOT NULL,
  plan       JSON        NULL,
  created_at VARCHAR(40) NOT NULL,
  INDEX idx_workouts_user (user_id)
) ENGINE=InnoDB;

-- coach_messages (Mongo: db.coach_messages) ----------------------------------
CREATE TABLE IF NOT EXISTS coach_messages (
  id              CHAR(36)    NOT NULL PRIMARY KEY,
  user_id         CHAR(36)    NOT NULL,
  session_id      VARCHAR(128) NOT NULL,
  role_user       TEXT        NULL,
  role_assistant  TEXT        NULL,
  created_at      VARCHAR(40) NOT NULL,
  INDEX idx_coach_user (user_id),
  INDEX idx_coach_created (created_at)
) ENGINE=InnoDB;

-- body_scans (Mongo: db.body_scans) ------------------------------------------
CREATE TABLE IF NOT EXISTS body_scans (
  id         CHAR(36)    NOT NULL PRIMARY KEY,
  user_id    CHAR(36)    NOT NULL,
  result     JSON        NULL,
  created_at VARCHAR(40) NOT NULL,
  INDEX idx_scans_user (user_id)
) ENGINE=InnoDB;

-- progress (Mongo: db.progress) ----------------------------------------------
CREATE TABLE IF NOT EXISTS progress (
  id         CHAR(36)    NOT NULL PRIMARY KEY,
  user_id    CHAR(36)    NOT NULL,
  weight_kg  DOUBLE      NOT NULL,
  body_fat   DOUBLE      NULL,
  waist_cm   DOUBLE      NULL,
  date       VARCHAR(12) NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  INDEX idx_progress_user_date (user_id, date)
) ENGINE=InnoDB;

-- sessions (Mongo: db.sessions) ----------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id             CHAR(36)     NOT NULL PRIMARY KEY,
  user_id        CHAR(36)     NOT NULL,
  exercise       VARCHAR(255) NOT NULL,
  reps           INT          NOT NULL DEFAULT 0,
  duration_sec   INT          NOT NULL DEFAULT 0,
  avg_form_score INT          NOT NULL DEFAULT 0,
  calories       DOUBLE       NOT NULL DEFAULT 0,
  date           VARCHAR(12)  NOT NULL,
  created_at     VARCHAR(40)  NOT NULL,
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_created (created_at)
) ENGINE=InnoDB;

-- payments (Mongo: db.payments) ----------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id         CHAR(36)     NOT NULL PRIMARY KEY,
  user_id    CHAR(36)     NOT NULL,
  plan       VARCHAR(32)  NOT NULL,
  order_id   VARCHAR(128) NOT NULL,
  payment_id VARCHAR(128) NULL,
  amount     INT          NOT NULL,
  status     VARCHAR(32)  NOT NULL DEFAULT 'created',
  paid_at    VARCHAR(40)  NULL,
  created_at VARCHAR(40)  NOT NULL,
  INDEX idx_payments_user (user_id),
  INDEX idx_payments_order (order_id)
) ENGINE=InnoDB;

-- feedback (added feature) -----------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback (
  id         CHAR(36)     NOT NULL PRIMARY KEY,
  user_id    CHAR(36)     NOT NULL,
  user_name  VARCHAR(255) NULL,
  user_email VARCHAR(255) NULL,
  category   VARCHAR(32)  NOT NULL DEFAULT 'general',
  rating     INT          NOT NULL DEFAULT 0,
  message    TEXT         NOT NULL,
  created_at VARCHAR(40)  NOT NULL,
  INDEX idx_feedback_user (user_id),
  INDEX idx_feedback_created (created_at)
) ENGINE=InnoDB;
