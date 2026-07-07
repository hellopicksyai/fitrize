import { Router } from "express";
import { pool } from "../config/db.js";
import { getCurrentUser } from "../middleware/auth.js";
import { nowIso } from "../utils/helpers.js";
import { validate } from "../utils/validate.js";

const router = Router();

const calcBmi = (w, hCm) => {
  const h = hCm / 100;
  return Math.round((w / (h * h)) * 10) / 10;
};

const calcBmr = (weight, heightCm, age, gender) => {
  // Mifflin-St Jeor
  const s = gender === "male" ? 5 : -161;
  return 10 * weight + 6.25 * heightCm - 5 * age + s;
};

const activityFactor = (level) =>
  ({ sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }[
    level
  ]);

// POST /api/assessment
router.post("/assessment", getCurrentUser, async (req, res, next) => {
  try {
    const v = validate(req.body, {
      age: { type: "int", required: true },
      gender: { type: "string", required: true, enum: ["male", "female", "other"] },
      height_cm: { type: "number", required: true },
      weight_kg: { type: "number", required: true },
      body_fat: { type: "number", default: null },
      activity_level: {
        type: "string",
        required: true,
        enum: ["sedentary", "light", "moderate", "active", "very_active"],
      },
      goal: {
        type: "string",
        required: true,
        enum: ["weight_loss", "fat_loss", "muscle_gain", "strength", "athletic", "general"],
      },
      experience: {
        type: "string",
        required: true,
        enum: ["beginner", "intermediate", "advanced"],
      },
      injuries: { type: "string", default: "" },
    });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    const body = v.value;

    const bmi = calcBmi(body.weight_kg, body.height_cm);
    const bmr = calcBmr(body.weight_kg, body.height_cm, body.age, body.gender);
    const tdee = bmr * activityFactor(body.activity_level);
    const hM = body.height_cm / 100;
    const idealLow = Math.round(18.5 * hM * hM * 10) / 10;
    const idealHigh = Math.round(24.9 * hM * hM * 10) / 10;

    const target = {
      weight_loss: tdee - 500,
      fat_loss: tdee - 400,
      muscle_gain: tdee + 350,
      strength: tdee + 200,
      athletic: tdee + 150,
      general: tdee,
    }[body.goal];

    const weeklyGoal = {
      weight_loss: "Lose 0.5 kg/week",
      fat_loss: "Lose 0.4 kg/week with strength training",
      muscle_gain: "Gain 0.25 kg/week with progressive overload",
      strength: "Add 2.5 kg to compound lifts/week",
      athletic: "Improve sprint time / endurance baseline",
      general: "Hit 4 workouts + 8k steps/day",
    }[body.goal];

    const profile = {
      ...body,
      bmi,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      maintenance_cal: Math.round(tdee),
      target_cal: Math.round(target),
      weight_loss_cal: Math.round(tdee - 500),
      muscle_gain_cal: Math.round(tdee + 350),
      ideal_weight_low: idealLow,
      ideal_weight_high: idealHigh,
      weekly_goal: weeklyGoal,
      protein_goal_g: Math.round(
        body.weight_kg * (["muscle_gain", "strength"].includes(body.goal) ? 1.8 : 1.5)
      ),
      water_goal_glasses: 8,
    };

    await pool.execute(
      "UPDATE users SET profile = ?, onboarded = 1, updated_at = ? WHERE id = ?",
      [JSON.stringify(profile), nowIso(), req.user.id]
    );
    return res.json(profile);
  } catch (err) {
    next(err);
  }
});

export default router;
