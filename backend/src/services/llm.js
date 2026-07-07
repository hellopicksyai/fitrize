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

// Port of llm_json: returns parsed JSON (or { raw: <text> } on failure).
export async function llmJson(system, prompt, images = []) {
  ensureKey();
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: system,
  });
  const parts = [{ text: prompt }, ...toImageParts(images)];
  const result = await model.generateContent(parts);
  const reply = result.response.text();
  const parsed = extractJson(reply);
  return Object.keys(parsed).length ? parsed : { raw: reply };
}

// Port of llm_chat: returns plain text reply.
export async function llmChat(system, prompt) {
  ensureKey();
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: system,
  });
  const result = await model.generateContent([{ text: prompt }]);
  return result.response.text();
}
