import { Router } from "express";
import { pool } from "../config/db.js";
import { getCurrentUser } from "../middleware/auth.js";
import { newId, nowIso } from "../utils/helpers.js";
import { validate } from "../utils/validate.js";
import { llmJson } from "../services/llm.js";

const router = Router();

// POST /api/nutrition/plan
router.post("/nutrition/plan", getCurrentUser, async (req, res, next) => {
  try {
    const v = validate(req.body, {
      diet_type: {
        type: "string",
        default: "high_protein",
        enum: ["vegetarian", "vegan", "non_veg", "indian", "keto", "high_protein"],
      },
      budget: { type: "string", default: "medium", enum: ["low", "medium", "high"] },
    });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    const b = v.value;
    const p = req.user.profile || {};
    const system =
      "You are an elite sports nutritionist. Generate a 1-day meal plan. " +
      'Respond ONLY JSON: {"breakfast":{"name":"","calories":0,"protein":0,"carbs":0,"fats":0,"items":[""]},' +
      '"lunch":{...},"dinner":{...},"snacks":{...},"daily_totals":{"calories":0,"protein":0,"carbs":0,"fats":0},"notes":""}';
    const prompt =
      `Goal: ${p.goal || "general"}. Target calories: ${p.target_cal || 2200}. ` +
      `Protein goal: ${p.protein_goal_g || 150}g. Diet: ${b.diet_type}. Budget: ${b.budget}. ` +
      `Weight: ${p.weight_kg || "?"} kg. Body fat: ${p.body_fat || "?"}.`;
    const plan = await llmJson(system, prompt);
    await pool.execute(
      "INSERT INTO meal_plans (id, user_id, plan, diet, created_at) VALUES (?, ?, ?, ?, ?)",
      [newId(), req.user.id, JSON.stringify(plan), b.diet_type, nowIso()]
    );
    return res.json(plan);
  } catch (err) {
    next(err);
  }
});

// POST /api/workouts/generate
router.post("/workouts/generate", getCurrentUser, async (req, res, next) => {
  try {
    const v = validate(req.body, {
      workout_type: {
        type: "string",
        default: "gym",
        enum: ["gym", "home", "calisthenics", "crossfit", "strength", "muscle", "fat_loss", "functional"],
      },
      days_per_week: { type: "int", default: 4 },
      equipment: { type: "array", default: [] },
    });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    const b = v.value;
    const p = req.user.profile || {};
    const system =
      "You are an elite strength & conditioning coach. Build a weekly workout split. " +
      'Respond ONLY JSON: {"split_name":"","days":[{"day":"Mon","focus":"","exercises":[{"name":"","sets":4,"reps":"6-8","rest_sec":120,"notes":""}]}],"progression":"","cardio":""}';
    const prompt =
      `Experience: ${p.experience || "beginner"}. Goal: ${p.goal || "general"}. ` +
      `Type: ${b.workout_type}. Days/week: ${b.days_per_week}. ` +
      `Equipment: ${b.equipment.join(", ") || "standard gym"}. ` +
      `Injuries: ${p.injuries || "none"}.`;
    const plan = await llmJson(system, prompt);
    await pool.execute(
      "INSERT INTO workouts (id, user_id, plan, created_at) VALUES (?, ?, ?, ?)",
      [newId(), req.user.id, JSON.stringify(plan), nowIso()]
    );
    return res.json(plan);
  } catch (err) {
    next(err);
  }
});

export default router;
