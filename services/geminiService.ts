
import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const openingSchema = {
  type: Type.OBJECT,
  properties: {
    name: {
      type: Type.STRING,
      description: "Der gebräuchliche Name der Schacheröffnung.",
    },
    eco: {
      type: Type.STRING,
      description: "Der ECO-Code (Encyclopedia of Chess Openings) für die Eröffnung.",
    },
  },
  required: ["name", "eco"],
};

export const getOpeningName = async (pgn: string): Promise<{ name: string; eco: string }> => {
  try {
    // Limit PGN length to first 30 moves to be efficient
    const moves = pgn.split(/\d+\./).slice(0, 31).join(' ');

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analysiere die folgende Schachpartie im PGN-Format und identifiziere die gespielte Eröffnung. Gib nur den gebräuchlichen Namen und den ECO-Code an. PGN: ${moves}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: openingSchema,
      },
    });

    const text = response.text.trim();
    const result = JSON.parse(text);

    if (result && result.name && result.eco) {
      return result;
    } else {
      return { name: "Unbekannte Eröffnung", eco: "A00" };
    }
  } catch (error) {
    console.error("Error fetching opening name from Gemini:", error);
    throw new Error("Could not determine opening.");
  }
};
