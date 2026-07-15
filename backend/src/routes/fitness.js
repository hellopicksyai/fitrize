import { Router } from "express";
import { pool, query, queryOne } from "../config/db.js";
import { getCurrentUser } from "../middleware/auth.js";
import { newId, nowIso } from "../utils/helpers.js";
import { validate } from "../utils/validate.js";
import { llmJson, llmChat } from "../services/llm.js";

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
    const isIndian = b.diet_type === "indian";
    const isVeg = b.diet_type === "vegetarian" || b.diet_type === "vegan";
    const system =
      "You are an elite sports nutritionist. Generate a realistic 1-day meal plan with FOUR meals. " +
      "EVERY meal including snacks MUST be filled in with a real dish, macros, and at least 2 food items — never leave any meal empty. " +
      "Prefer easily available, affordable, everyday foods. Do NOT use beef or lean beef. " +
      (isIndian ? "Use Indian dishes and ingredients (dal, roti, paneer, curd, rice, chicken/egg if non-veg, sabzi, etc.). " : "") +
      (isVeg ? "Keep everything strictly vegetarian (no meat, fish, or eggs for vegan). " : "") +
      'Respond ONLY with valid JSON in exactly this shape (no markdown): ' +
      '{"breakfast":{"name":"","calories":0,"protein":0,"carbs":0,"fats":0,"items":["",""]},' +
      '"lunch":{"name":"","calories":0,"protein":0,"carbs":0,"fats":0,"items":["",""]},' +
      '"dinner":{"name":"","calories":0,"protein":0,"carbs":0,"fats":0,"items":["",""]},' +
      '"snacks":{"name":"","calories":0,"protein":0,"carbs":0,"fats":0,"items":["",""]},' +
      '"daily_totals":{"calories":0,"protein":0,"carbs":0,"fats":0},"notes":""}';
    const prompt =
      `Goal: ${p.goal || "general"}. Target calories: ${p.target_cal || 2200}. ` +
      `Protein goal: ${p.protein_goal_g || 150}g. Diet type: ${b.diet_type}. Budget: ${b.budget}. ` +
      `Weight: ${p.weight_kg || "?"} kg. ` +
      `Remember: fill breakfast, lunch, dinner AND snacks. No beef.`;

    let plan = await llmJson(system, prompt);

    // Fallback: guarantee snacks (and other meals) are never empty.
    const emptyMeal = (m) => !m || typeof m !== "object" || (!m.name && !(m.items || []).length);
    const fallbackSnack = isIndian
      ? { name: "Roasted chana & curd", calories: 250, protein: 15, carbs: 30, fats: 6, items: ["Roasted chana 40g", "Bowl of curd"] }
      : { name: "Greek yogurt & nuts", calories: 250, protein: 18, carbs: 20, fats: 10, items: ["Greek yogurt 150g", "Mixed nuts 20g"] };
    if (emptyMeal(plan?.snacks)) plan = { ...plan, snacks: fallbackSnack };
    // if the whole thing failed to parse, give a minimal safe structure
    if (!plan || (emptyMeal(plan.breakfast) && emptyMeal(plan.lunch) && emptyMeal(plan.dinner))) {
      plan = {
        breakfast: isIndian ? { name: "Poha with peanuts", calories: 350, protein: 10, carbs: 55, fats: 10, items: ["Poha", "Peanuts", "Veggies"] } : { name: "Oats & eggs", calories: 400, protein: 24, carbs: 40, fats: 14, items: ["Oats 60g", "2 eggs", "Banana"] },
        lunch: isIndian ? { name: "Dal, roti & sabzi", calories: 550, protein: 22, carbs: 70, fats: 15, items: ["Dal", "2 roti", "Mixed veg sabzi", "Curd"] } : { name: "Chicken rice bowl", calories: 600, protein: 40, carbs: 60, fats: 15, items: ["Chicken 150g", "Rice 1 cup", "Salad"] },
        dinner: isIndian ? { name: "Paneer & roti", calories: 500, protein: 25, carbs: 45, fats: 20, items: ["Paneer 100g", "2 roti", "Salad"] } : { name: "Grilled fish & veg", calories: 500, protein: 38, carbs: 30, fats: 20, items: ["Fish 150g", "Steamed veg", "Quinoa"] },
        snacks: fallbackSnack,
        daily_totals: { calories: p.target_cal || 2200, protein: p.protein_goal_g || 150, carbs: 220, fats: 60 },
        notes: "A balanced starting plan — adjust portions to hit your targets.",
      };
    }

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

// GET /api/progress-insights — personalized AI insight from the user's real data.
// This is the "Gemini explains YOUR data" model (items 12 & 13): the app computes
// the numbers, the AI just phrases them personally.
router.get("/progress-insights", getCurrentUser, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const p = req.user.profile || {};

    // weight trend (first vs latest in last 8 weeks)
    const weights = await query(
      "SELECT weight_kg, date FROM progress WHERE user_id = ? ORDER BY date ASC",
      [uid]
    );
    // strength: biggest PR jumps
    const prs = await query(
      "SELECT exercise, best_weight, best_reps FROM personal_records WHERE user_id = ? ORDER BY best_weight DESC LIMIT 5",
      [uid]
    );
    const workoutCount = (await queryOne("SELECT COUNT(*) AS c FROM workout_logs WHERE user_id = ?", [uid]))?.c || 0;

    // Build a factual summary the AI will phrase (app computes, AI explains)
    const facts = [];
    if (weights.length >= 2) {
      const first = weights[0], last = weights[weights.length - 1];
      const diff = (last.weight_kg - first.weight_kg).toFixed(1);
      facts.push(`Weight changed from ${first.weight_kg}kg to ${last.weight_kg}kg (${diff >= 0 ? "+" : ""}${diff}kg).`);
    }
    if (prs.length) {
      facts.push("Top lifts: " + prs.map(pr => `${pr.exercise} ${Math.round(pr.best_weight)}kg×${pr.best_reps}`).join(", ") + ".");
    }
    facts.push(`${workoutCount} workouts logged.`);

    let insight = "";
    if (facts.length) {
      const system =
        "You are the user's fitness coach. Turn these facts into 2-3 short, encouraging, PERSONALIZED sentences. " +
        "Reference the actual numbers. No markdown, no bullet points, plain text. " +
        `The user's goal is ${p.goal || "general fitness"}.`;
      try {
        insight = await llmChat(system, "Facts about my progress: " + facts.join(" "));
      } catch {
        insight = "";
      }
    }

    return res.json({
      insight: insight.trim(),
      facts,
      weight_points: weights,
      personal_records: prs,
      workout_count: workoutCount,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
