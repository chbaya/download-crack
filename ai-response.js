const functions = require("firebase-functions");
const axios = require("axios");

const GEMINI_API_KEY = "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

exports.getAiResponse = functions.https.onCall(async (data, context) => {
  try {
    const { userMessage, games } = data;

    if (!userMessage) {
      throw new Error("User message is required");
    }

    // Build game list for context
    const gameList = games
      .map((g) => `- ${g.title}: ${g.description || "No description"}`)
      .join("\n");

    const prompt = `You are a helpful game recommendation assistant. The user asked: "${userMessage}"

Available free games in our collection:
${gameList}

Based on their question, provide a helpful game recommendation or answer. Keep your response concise (1-2 sentences). If recommending a game, make sure it's from the list above.`;

    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }
    );

    const aiResponse =
      response.data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I couldn't generate a response. Please try again.";

    return {
      success: true,
      response: aiResponse,
    };
  } catch (error) {
    console.error("Gemini API Error:", error.message);
    return {
      success: false,
      response: "Sorry, I encountered an error. Please try again later.",
      error: error.message,
    };
  }
});
