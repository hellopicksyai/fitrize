import { Router } from "express";
import { pool, query, queryOne } from "../config/db.js";
import { getCurrentUser } from "../middleware/auth.js";
import { newId, nowIso, today } from "../utils/helpers.js";
import { validate } from "../utils/validate.js";
import { llmJson } from "../services/llm.js";

const router = Router();

// POST /api/meals/log
router.post("/meals/log", getCurrentUser, async (req, res, next) => {
  try {
    const v = validate(req.body, {
      name: { type: "string", required: true },
      calories: { type: "number", required: true },
      protein: { type: "number", required: true },
      carbs: { type: "number", required: true },
      fats: { type: "number", required: true },
      fiber: { type: "number", default: 0 },
      sugar: { type: "number", default: 0 },
      meal_type: {
        type: "string",
        default: "snack",
        enum: ["breakfast", "lunch", "dinner", "snack"],
      },
    });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    const b = v.value;
    const doc = {
      ...b,
      id: newId(),
      user_id: req.user.id,
      date: today(),
      created_at: nowIso(),
    };
    await pool.execute(
      `INSERT INTO meals (id, user_id, name, calories, protein, carbs, fats, fiber, sugar, meal_type, date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        doc.id, doc.user_id, b.name, b.calories, b.protein, b.carbs, b.fats,
        b.fiber, b.sugar, b.meal_type, doc.date, doc.created_at,
      ]
    );
    await pool.execute("UPDATE users SET xp = xp + 10 WHERE id = ?", [req.user.id]);
    return res.json(doc);
  } catch (err) {
    next(err);
  }
});

// POST /api/meals/analyze-image
router.post("/meals/analyze-image", getCurrentUser, async (req, res, next) => {
  try {
    const v = validate(req.body, {
      image_base64: { type: "string", required: true },
      mime_type: { type: "string", default: "image/jpeg" },
    });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    const system =
      "You are a precise nutrition analyzer. Identify foods in the image and estimate macros. " +
      'Respond ONLY with JSON: {"name":"...", "calories":0, "protein":0, "carbs":0, "fats":0, "fiber":0, "sugar":0, "confidence":0.0, "items":["..."]}. ' +
      "All numeric values per realistic portion shown.";
    const data = await llmJson(system, "Analyze this meal image.", [
      { base64: v.value.image_base64, mimeType: v.value.mime_type },
    ]);
    return res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/meals/voice
router.post("/meals/voice", getCurrentUser, async (req, res, next) => {
  try {
    const v = validate(req.body, { text: { type: "string", required: true } });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    const system =
      "You parse a spoken food description into nutrition. " +
      'Respond ONLY JSON: {"name":"...", "calories":0, "protein":0, "carbs":0, "fats":0, "fiber":0, "sugar":0}';
    const data = await llmJson(system, `User said: ${v.value.text}`);
    return res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/meals/today
router.get("/meals/today", getCurrentUser, async (req, res, next) => {
  try {
    const items = await query(
      "SELECT id, user_id, name, calories, protein, carbs, fats, fiber, sugar, meal_type, date, created_at FROM meals WHERE user_id = ? AND date = ?",
      [req.user.id, today()]
    );
    const totals = { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0, sugar: 0 };
    for (const m of items) {
      for (const k of Object.keys(totals)) totals[k] += m[k] || 0;
    }
    const water = await queryOne(
      "SELECT glasses FROM water WHERE user_id = ? AND date = ?",
      [req.user.id, today()]
    );
    return res.json({
      meals: items,
      totals,
      water_glasses: water ? water.glasses : 0,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/meals/:meal_id
router.delete("/meals/:meal_id", getCurrentUser, async (req, res, next) => {
  try {
    await pool.execute("DELETE FROM meals WHERE id = ? AND user_id = ?", [
      req.params.meal_id,
      req.user.id,
    ]);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/water
router.post("/water", getCurrentUser, async (req, res, next) => {
  try {
    const v = validate(req.body, { glasses: { type: "int", required: true } });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    // upsert (MongoDB upsert=True equivalent)
    await pool.execute(
      `INSERT INTO water (id, user_id, date, glasses, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE glasses = VALUES(glasses), updated_at = VALUES(updated_at)`,
      [newId(), req.user.id, today(), v.value.glasses, nowIso()]
    );
    return res.json({ glasses: v.value.glasses });
  } catch (err) {
    next(err);
  }
});

export default router;
