import { Router } from "express";
import { query, queryOne } from "../config/db.js";
import { getCurrentUser } from "../middleware/auth.js";
import { today } from "../utils/helpers.js";

const router = Router();

// GET /api/notifications — generate contextual, data-driven notifications.
router.get("/notifications", getCurrentUser, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const p = req.user.profile || {};
    const d = today();
    const notes = [];

    // --- gather signals ---
    const workoutToday = await queryOne("SELECT COUNT(*) AS c FROM workout_logs WHERE user_id = ? AND date = ?", [uid, d]);
    const proteinToday = await queryOne("SELECT ROUND(SUM(protein)) AS p FROM meals WHERE user_id = ? AND date = ?", [uid, d]);
    const waterToday = await queryOne("SELECT glasses FROM water WHERE user_id = ? AND date = ?", [uid, d]);
    const caloriesToday = await queryOne("SELECT ROUND(SUM(calories)) AS c FROM meals WHERE user_id = ? AND date = ?", [uid, d]);
    const streak = req.user.streak || 0;
    const proteinGoal = p.protein_goal_g || 150;
    const calorieTarget = p.target_cal || 2200;

    const didWorkout = (workoutToday?.c || 0) > 0;
    const protein = proteinToday?.p || 0;
    const water = waterToday?.glasses || 0;
    const calories = caloriesToday?.c || 0;

    // --- streak nudges ---
    if (streak > 0 && !didWorkout) {
      notes.push({
        type: "streak", priority: 1, icon: "Flame",
        title: `You're one workout away from a ${streak + 1}-day streak`,
        body: "Log a workout today to keep your streak alive.",
      });
    } else if (streak >= 3 && didWorkout) {
      notes.push({
        type: "streak", priority: 3, icon: "Flame",
        title: `🔥 ${streak}-day streak going strong`,
        body: "Consistency is paying off. Keep it up.",
      });
    }

    // --- protein reminder ---
    if (protein < proteinGoal * 0.6) {
      notes.push({
        type: "protein", priority: 2, icon: "Trophy",
        title: "You haven't hit your protein yet",
        body: `${protein}g of ${proteinGoal}g so far today. ${Math.max(0, proteinGoal - protein)}g to go.`,
      });
    }

    // --- water reminder ---
    if (water < 8) {
      notes.push({
        type: "water", priority: 2, icon: "Droplet",
        title: "Stay hydrated",
        body: `${water} of 8 glasses today. A quick top-up keeps you on track.`,
      });
    }

    // --- calorie check ---
    if (calories === 0) {
      notes.push({
        type: "nutrition", priority: 2, icon: "Utensils",
        title: "No meals logged today",
        body: "Log your first meal to track calories and macros.",
      });
    } else if (calories > calorieTarget * 1.1) {
      notes.push({
        type: "nutrition", priority: 2, icon: "Flame",
        title: "Over your calorie target",
        body: `You're at ${calories} kcal vs a ${calorieTarget} target. A lighter dinner can balance it.`,
      });
    }

    // --- workout done celebration ---
    if (didWorkout) {
      notes.push({
        type: "workout", priority: 4, icon: "Dumbbell",
        title: "Workout logged today ✅",
        body: "Nice work. Recovery and protein matter now.",
      });
    } else {
      notes.push({
        type: "workout", priority: 3, icon: "Dumbbell",
        title: "Ready to train?",
        body: "Generate a workout or log one to move your goals forward.",
      });
    }

    // --- onboarding nudge ---
    if (!p.goal) {
      notes.push({
        type: "setup", priority: 1, icon: "Sparkles",
        title: "Finish your setup",
        body: "Complete your assessment for personalized targets.",
      });
    }

    // sort by priority (1 = most important)
    notes.sort((a, b) => a.priority - b.priority);

    // "unread" = actionable ones (priority <= 2)
    const unread = notes.filter((n) => n.priority <= 2).length;

    return res.json({ notifications: notes, unread, count: notes.length });
  } catch (err) {
    next(err);
  }
});

export default router;
