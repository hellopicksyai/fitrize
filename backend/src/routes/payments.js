import { Router } from "express";
import crypto from "crypto";
import { pool, queryOne } from "../config/db.js";
import { getCurrentUser } from "../middleware/auth.js";
import { newId, nowIso } from "../utils/helpers.js";
import { validate } from "../utils/validate.js";
import {
  rzpClient,
  PLANS,
  RZP_KEY_ID_PUBLIC,
  RZP_KEY_SECRET_RAW,
} from "../services/razorpay.js";

const router = Router();

// POST /api/payments/order
router.post("/payments/order", getCurrentUser, async (req, res, next) => {
  try {
    if (!rzpClient) return res.status(503).json({ detail: "Razorpay not configured" });
    const v = validate(req.body, {
      plan: { type: "string", required: true, enum: ["pro", "elite"] },
    });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    const plan = PLANS[v.value.plan];

    const order = await rzpClient.orders.create({
      amount: plan.amount_paise,
      currency: "INR",
      receipt: `bf_${req.user.id.slice(0, 8)}_${Math.floor(Date.now() / 1000)}`,
      notes: { user_id: req.user.id, plan: v.value.plan },
    });

    await pool.execute(
      "INSERT INTO payments (id, user_id, plan, order_id, amount, status, created_at) VALUES (?, ?, ?, ?, ?, 'created', ?)",
      [newId(), req.user.id, v.value.plan, order.id, plan.amount_paise, nowIso()]
    );

    return res.json({
      order_id: order.id,
      amount: order.amount,
      currency: "INR",
      key_id: RZP_KEY_ID_PUBLIC,
      plan_label: plan.label,
      user: { name: req.user.name, email: req.user.email },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/verify
router.post("/payments/verify", getCurrentUser, async (req, res, next) => {
  try {
    if (!rzpClient) return res.status(503).json({ detail: "Razorpay not configured" });
    const v = validate(req.body, {
      order_id: { type: "string", required: true },
      payment_id: { type: "string", required: true },
      signature: { type: "string", required: true },
      plan: { type: "string", required: true, enum: ["pro", "elite"] },
    });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    const b = v.value;

    const expected = crypto
      .createHmac("sha256", RZP_KEY_SECRET_RAW)
      .update(`${b.order_id}|${b.payment_id}`)
      .digest("hex");

    // timing-safe compare
    const ok =
      expected.length === b.signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(b.signature));
    if (!ok) return res.status(400).json({ detail: "Invalid payment signature" });

    const tier = PLANS[b.plan].tier;
    await pool.execute(
      "UPDATE payments SET status = 'paid', payment_id = ?, paid_at = ? WHERE order_id = ?",
      [b.payment_id, nowIso(), b.order_id]
    );
    await pool.execute("UPDATE users SET tier = ?, tier_since = ? WHERE id = ?", [
      tier,
      nowIso(),
      req.user.id,
    ]);
    return res.json({ ok: true, tier });
  } catch (err) {
    next(err);
  }
});

export default router;
