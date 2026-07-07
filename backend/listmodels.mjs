import "dotenv/config";

const key = process.env.GEMINI_API_KEY;
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
);
const data = await res.json();

if (!data.models) {
  console.log("No models returned. Raw response:", JSON.stringify(data, null, 2));
} else {
  console.log("Models your key can use for generateContent:\n");
  for (const m of data.models) {
    if (m.supportedGenerationMethods?.includes("generateContent")) {
      console.log("  " + m.name.replace("models/", ""));
    }
  }
}