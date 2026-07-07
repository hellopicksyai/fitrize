import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
try {
  const r = await model.generateContent("Say hello in 3 words");
  console.log("SUCCESS:", r.response.text());
} catch (e) {
  console.log("FAILED:", e.message);
}