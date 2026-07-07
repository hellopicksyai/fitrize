import { Router } from "express";
import { pool, query, queryOne } from "../config/db.js";
import { getCurrentUser } from "../middleware/auth.js";
import { newId, nowIso } from "../utils/helpers.js";

const router = Router();

// Badge catalogue. Each badge: how to measure current progress + the target.
// `metric` is resolved in gatherStats() below.
const BADGES = [
  { key: "first_workout", title: "First Steps", desc: "Log your first workout", icon: "Dumbbell", metric: "workouts", target: 1, xp: 20 },
  { key: "workouts_10", title: "Getting Consistent", desc: "Log 10 workouts", icon: "Dumbbell", metric: "workouts", target: 10, xp: 50 },
  { key: "workouts_30", title: "Dedicated", desc: "Log 30 workouts", icon: "Flame", metric: "workouts", target: 30, xp: 150 },
  { key: "first_pr", title: "New Record", desc: "Set your first personal record", icon: "Trophy", metric: "prs", target: 1, xp: 30 },
  { key: "prs_10", title: "Record Breaker", desc: "Set 10 personal records", icon: "Trophy", metric: "prs", target: 10, xp: 100 },
  { key: "streak_7", title: "One Week Strong", desc: "Reach a 7-day streak", icon: "Flame", metric: "streak", target: 7, xp: 70 },
  { key: "streak_30", title: "Unstoppable", desc: "Reach a 30-day streak", icon: "Flame", metric: "streak", target: 30, xp: 300 },
  { key: "steps_10k", title: "10K Steps", desc: "Hit 10,000 steps in a day", icon: "Footprints", metric: "best_steps", target: 10000, xp: 40 },
  { key: "meals_25", title: "Nutrition Tracker", desc: "Log 25 meals", icon: "Utensils", metric: "meals", target: 25, xp: 60 },
  { key: "xp_500", title: "Rising Star", desc: "Earn 500 XP", icon: "Star", metric: "xp", target: 500, xp: 100 },
  { key: "xp_2000", title: "Elite Athlete", desc: "Earn 2000 XP", icon: "Star", metric: "xp", target: 2000, xp: 250 },
];

async function gatherStats(uid, user) {
  const wl = await queryOne("SELECT COUNT(*) AS c FROM workout_logs WHERE user_id = ?", [uid]);
  const pr = await queryOne("SELECT COUNT(*) AS c FROM personal_records WHERE user_id = ?", [uid]);
  const meals = await queryOne("SELECT COUNT(*) AS c FROM meals WHERE user_id = ?", [uid]);
  let bestSteps = { s: 0 };
  try { bestSteps = await queryOne("SELECT MAX(steps) AS s FROM habits WHERE user_id = ?", [uid]) || { s: 0 }; } catch { /* habits table may not exist yet */ }
  return {
    workouts: wl?.c || 0,
    prs: pr?.c || 0,
    meals: meals?.c || 0,
    best_steps: bestSteps?.s || 0,
    streak: user?.streak || 0,
    xp: user?.xp || 0,
  };
}

// GET /api/achievements — evaluate, unlock new ones, return full list
router.get("/achievements", getCurrentUser, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const stats = await gatherStats(uid, req.user);

    const unlockedRows = await query("SELECT badge_key, unlocked_at FROM achievements WHERE user_id = ?", [uid]);
    const unlockedMap = {};
    for (const r of unlockedRows) unlockedMap[r.badge_key] = r.unlocked_at;

    const newlyUnlocked = [];
    let bonusXp = 0;

    const list = BADGES.map((b) => {
      const current = stats[b.metric] || 0;
      const earned = current >= b.target;
      const already = !!unlockedMap[b.key];

      if (earned && !already) {
        newlyUnlocked.push(b);
        bonusXp += b.xp;
      }

      return {
        key: b.key, title: b.title, desc: b.desc, icon: b.icon,
        target: b.target, current: Math.min(current, b.target),
        raw_current: current,
        pct: Math.min(100, Math.round((current / b.target) * 100)),
        xp: b.xp,
        unlocked: earned || already,
        unlocked_at: unlockedMap[b.key] || (earned ? nowIso() : null),
      };
    });

    // Persist newly unlocked + award XP once
    for (const b of newlyUnlocked) {
      await pool.execute(
        "INSERT IGNORE INTO achievements (id, user_id, badge_key, unlocked_at) VALUES (?, ?, ?, ?)",
        [newId(), uid, b.key, nowIso()]
      );
    }
    if (bonusXp > 0) {
      await pool.execute("UPDATE users SET xp = xp + ? WHERE id = ?", [bonusXp, uid]);
    }

    const unlockedCount = list.filter((b) => b.unlocked).length;
    return res.json({
      badges: list,
      unlocked_count: unlockedCount,
      total: list.length,
      newly_unlocked: newlyUnlocked.map((b) => ({ key: b.key, title: b.title, xp: b.xp })),
      bonus_xp: bonusXp,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
