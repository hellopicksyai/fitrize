import { Router } from "express";
import { col } from "../config/db.js";
import { getCurrentUser } from "../middleware/auth.js";
import { newId, nowIso } from "../utils/helpers.js";
import { validate } from "../utils/validate.js";

const router = Router();

router.post("/feedback", getCurrentUser, async (req, res, next) => {
  try {
    const v = validate(req.body, {
      category: { type: "string", default: "general", enum: ["general", "bug", "feature", "praise"] },
      rating: { type: "int", default: 0 },
      message: { type: "string", required: true },
    });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    const b = v.value;
    const doc = {
      id: newId(),
      user_id: req.user.id,
      user_name: req.user.name,
      user_email: req.user.email,
      category: b.category,
      rating: b.rating,
      message: b.message,
      created_at: nowIso(),
    };
    await col("feedback").insertOne({ ...doc });
    await col("users").updateOne({ id: req.user.id }, { $inc: { xp: 5 } });
    return res.json(doc);
  } catch (err) { next(err); }
});

router.get("/feedback", getCurrentUser, async (req, res, next) => {
  try {
    const items = await col("feedback")
      .find({ user_id: req.user.id }, { projection: { _id: 0, id: 1, category: 1, rating: 1, message: 1, created_at: 1 } })
      .sort({ created_at: -1 }).limit(50).toArray();
    return res.json(items);
  } catch (err) { next(err); }
});

export default router;
