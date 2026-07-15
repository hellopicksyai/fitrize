import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractJson } from "../utils/helpers.js";

const API_KEY = process.env.GEMINI_API_KEY || "";
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

// The original backend used a proprietary `emergentintegrations` wrapper around
// Gemini. There is no Node equivalent, so we use Google's official SDK directly.
// Requires your own GEMINI_API_KEY (free at https://aistudio.google.com).
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

function ensureKey() {
  if (!genAI) {
    const err = new Error(
      "GEMINI_API_KEY is not set. Add it to backend/.env to enable AI features."
    );
    err.status = 503;
    throw err;
  }
}

// images: array of { base64, mimeType } -> Gemini inlineData parts.
function toImageParts(images = []) {
  return images.map((img) => ({
    inlineData: {
      data: img.base64,
      mimeType: img.mimeType || "image/jpeg",
    },
  }));
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
      // brief backoff: 0.8s, 1.6s
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw lastErr;
}

// Port of llm_json: returns parsed JSON (or { raw: <text> } on failure).
export async function llmJson(system, prompt, images = []) {
  ensureKey();
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: system,
  });
  const parts = [{ text: prompt }, ...toImageParts(images)];
  const reply = await withRetry(async () => {
    const result = await model.generateContent(parts);
    return result.response.text();
  });
  const parsed = extractJson(reply);
  return Object.keys(parsed).length ? parsed : { raw: reply };
}

// Port of llm_chat: returns plain text reply.
// Analyze a short video (e.g. a lifting set) and return structured JSON.
// Gemini accepts video as inline base64, just like images.
export async function llmVideo(system, prompt, videoBase64, mimeType = "video/mp4") {
  ensureKey();
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: system,
  });
  const reply = await withRetry(async () => {
    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { data: videoBase64, mimeType } },
    ]);
    return result.response.text();
  });
  const parsed = extractJson(reply);
  return Object.keys(parsed).length ? parsed : { raw: reply };
}

// llmChat with conversation memory.
// history: [{ role: "user"|"model", text: "..." }] — earlier turns of this chat.
export async function llmChat(system, prompt, history = []) {
  ensureKey();
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: system,
  });

  return await withRetry(async () => {
    // Gemini's chat API keeps the whole conversation in context, so the coach
    // remembers things like "I'm vegetarian" from earlier messages.
    const chat = model.startChat({
      history: history.map((h) => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.text }],
      })),
    });
    const result = await chat.sendMessage(prompt);
    return result.response.text();
  });
}
