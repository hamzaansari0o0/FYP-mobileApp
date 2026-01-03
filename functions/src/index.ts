// Agar googleAI par line aaye to IGNORE karein. Code 100% chalega.
import { googleAI } from "@genkit-ai/googleai";
import * as logger from "firebase-functions/logger";
import { onCall } from "firebase-functions/v2/https";
import { genkit, z } from "genkit";

const ai = genkit({
  // Brackets khali rakhein. Ye environment variable se Key uthayega.
  plugins: [googleAI()], 
  
  // Model name string mein (Provider ke sath)
  model: "googleai/gemini-1.5-flash", 
});

const ChatResponseSchema = z.object({
  reply: z.string(),
  command: z.enum(["NONE", "NAVIGATE_HOME", "NAVIGATE_PROFILE", "NAVIGATE_BOOKINGS"]),
});

export const chatWithGenkit = onCall({ secrets: ["GOOGLE_GENAI_API_KEY"] }, async (request) => {
  const userMessage = request.data.message || "";
  logger.info("🔍 Request received. Using Google AI...");

  try {
    const { output } = await ai.generate({
      prompt: `User said: "${userMessage}". Reply helpfully regarding sports court booking.`,
      output: { schema: ChatResponseSchema },
    });
    return output; 
  } catch (error: any) {
    logger.error("❌ GENKIT ERROR:", error);
    return { reply: `Error: ${error.message}`, command: "NONE" };
  }
});