// src/lib/gemini.js

import { GoogleGenAI } from "@google/genai";

// Create the client once
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function translateText(text, targetLanguage) {
  const result = await genAI.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text:`You are a professional translator for a language exchange chat app.
    Translate the following chat message to ${targetLanguage}.
    Keep it natural, conversational, and short.
    Do not add any extra explanation or notes.
    Text to translate: ${text} `,
          },
        ],
      },
    ],
  });

  return result.candidates[0].content.parts[0].text;
}
