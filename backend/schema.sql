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

-- workout_logs / workout_sets / personal_records ------------------------------
CREATE TABLE IF NOT EXISTS workout_logs (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  user_id       CHAR(36)     NOT NULL,
  name          VARCHAR(255) NOT NULL DEFAULT 'Workout',
  notes         TEXT         NULL,
  duration_sec  INT          NOT NULL DEFAULT 0,
  total_volume  DOUBLE       NOT NULL DEFAULT 0,
  total_sets    INT          NOT NULL DEFAULT 0,
  date          VARCHAR(20)  NOT NULL,
  created_at    VARCHAR(40)  NOT NULL,
  INDEX idx_workoutlogs_user (user_id),
  INDEX idx_workoutlogs_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workout_sets (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  log_id      CHAR(36)     NOT NULL,
  user_id     CHAR(36)     NOT NULL,
  exercise    VARCHAR(255) NOT NULL,
  set_number  INT          NOT NULL,
  weight_kg   DOUBLE       NOT NULL DEFAULT 0,
  reps        INT          NOT NULL DEFAULT 0,
  is_pr       TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  VARCHAR(40)  NOT NULL,
  INDEX idx_workoutsets_log (log_id),
  INDEX idx_workoutsets_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS personal_records (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  user_id      CHAR(36)     NOT NULL,
  exercise     VARCHAR(255) NOT NULL,
  best_weight  DOUBLE       NOT NULL DEFAULT 0,
  best_reps    INT          NOT NULL DEFAULT 0,
  best_1rm     DOUBLE       NOT NULL DEFAULT 0,
  achieved_at  VARCHAR(40)  NOT NULL,
  UNIQUE KEY uniq_user_exercise (user_id, exercise),
  INDEX idx_pr_user (user_id)
) ENGINE=InnoDB;

-- habits / habit_goals ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS habits (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  user_id      CHAR(36)     NOT NULL,
  date         VARCHAR(20)  NOT NULL,
  sleep_hours  DOUBLE       NOT NULL DEFAULT 0,
  steps        INT          NOT NULL DEFAULT 0,
  updated_at   VARCHAR(40)  NOT NULL,
  UNIQUE KEY uniq_user_date (user_id, date),
  INDEX idx_habits_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS habit_goals (
  user_id       CHAR(36)    NOT NULL PRIMARY KEY,
  water_goal    INT         NOT NULL DEFAULT 8,
  protein_goal  INT         NOT NULL DEFAULT 150,
  sleep_goal    DOUBLE      NOT NULL DEFAULT 8,
  steps_goal    INT         NOT NULL DEFAULT 10000,
  updated_at    VARCHAR(40) NOT NULL
) ENGINE=InnoDB;

-- achievements ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS achievements (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  user_id      CHAR(36)     NOT NULL,
  badge_key    VARCHAR(64)  NOT NULL,
  unlocked_at  VARCHAR(40)  NOT NULL,
  UNIQUE KEY uniq_user_badge (user_id, badge_key),
  INDEX idx_achievements_user (user_id)
) ENGINE=InnoDB;
