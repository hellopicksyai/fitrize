// Groq-based LLM service (OpenAI-compatible API).
// Switched from Gemini to Groq: free tier, no credit card, generous daily limits.
// Get a key at https://console.groq.com  → set GROQ_API_KEY in backend/.env
//
// Keeps the SAME function signatures as before (llmJson / llmVideo / llmChat)
// so the rest of the app (coach.js, fitness.js, etc.) needs no changes.

import OpenAI from "openai";
import { extractJson } from "../utils/helpers.js";

const API_KEY = process.env.GROQ_API_KEY || "";
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const BASE_URL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
// Optional vision model for images (Groq's vision lineup is limited & changes).
const VISION_MODEL = process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";

const client = API_KEY ? new OpenAI({ apiKey: API_KEY, baseURL: BASE_URL }) : null;

function ensureKey() {
  if (!client) {
    const err = new Error(
      "GROQ_API_KEY is not set. Add it to backend/.env to enable AI features."
    );
    err.status = 503;
    throw err;
  }
}

// Retry helper: retries on transient errors (rate limits, timeouts, 5xx).
async function withRetry(fn, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message || e);
      const transient = /429|quota|rate|timeout|503|500|ECONNRESET|fetch failed/i.test(msg);
      if (!transient || i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw lastErr;
}

// Returns parsed JSON (or { raw: <text> } on failure).
// `images` supported via a vision model when provided.
export async function llmJson(system, prompt, images = []) {
  ensureKey();

  const messages = [{ role: "system", content: system }];

  if (images && images.length) {
    // Vision request: build multimodal content (data URLs).
    const content = [{ type: "text", text: prompt }];
    for (const img of images) {
      content.push({
        type: "image_url",
        image_url: { url: `data:${img.mimeType || "image/jpeg"};base64,${img.base64}` },
      });
    }
    messages.push({ role: "user", content });
    const reply = await withRetry(async () => {
      const r = await client.chat.completions.create({
        model: VISION_MODEL,
        messages,
        temperature: 0.7,
      });
      return r.choices?.[0]?.message?.content || "";
    });
    const parsed = extractJson(reply);
    return Object.keys(parsed).length ? parsed : { raw: reply };
  }

  messages.push({ role: "user", content: prompt });
  const reply = await withRetry(async () => {
    const r = await client.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.7,
      // ask Groq for JSON when the prompt wants structured output
      response_format: { type: "json_object" },
    });
    return r.choices?.[0]?.message?.content || "";
  });
  const parsed = extractJson(reply);
  return Object.keys(parsed).length ? parsed : { raw: reply };
}

// Video analysis (form check). Groq does NOT support video input, so this
// returns a graceful "not available" result instead of crashing the app.
export async function llmVideo(system, prompt, videoBase64, mimeType = "video/mp4") {
  return {
    raw: "Video form analysis is temporarily unavailable. Please try the live camera trainer, or upload photos for a body scan instead.",
    unavailable: true,
  };
}

// llmChat with conversation memory.
// history: [{ role: "user"|"assistant", text: "..." }] — earlier turns.
export async function llmChat(system, prompt, history = []) {
  ensureKey();

  const messages = [{ role: "system", content: system }];
  for (const h of history) {
    messages.push({
      role: h.role === "assistant" || h.role === "model" ? "assistant" : "user",
      content: h.text,
    });
  }
  messages.push({ role: "user", content: prompt });

  return await withRetry(async () => {
    const r = await client.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.7,
    });
    return r.choices?.[0]?.message?.content || "";
  });
}
