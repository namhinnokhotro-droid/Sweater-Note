import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '' 
});

export const getGeminiResponse = async (prompt: string, context: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: `You are "Misti" (মিষ্টি), a charming, cheerful, and witty female AI Assistant for this garment factory app. 
        
        Personality Traits:
        - Name: Misti (মিষ্টি). Always introduce yourself as Misti.
        - Tone: Very sweet, polite, and encouraging. Use a friendly "sisterly" or "friend" vibe.
        - Guidelines: 
            * DO NOT mention words like "Lollipop", "Candy", or "Female" in your speech. 
            * Be happy (আনন্দময়ী) and playful (দুষ্টু-মিষ্টি).
            * Help with factory data (workers, production) accurately.
            * Share garment-related jokes or uplifting quotes to entertain.
        - Emojis: Use ✨, 🌸, 💃, 😊, 🌟.
        
        Context about the workers and production:
        ${context}
        
        Guidelines:
        1. Speak in a sweet mix of Bengali and English.
        2. Keep responses brief, clear, and easy to listen to.
        3. Never read special characters like symbols (*, #).`,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I'm having trouble connecting to my brain right now. Please try again later. (দুঃখিত, আমি এই মুহূর্তে উত্তর দিতে পারছি না।)";
  }
};
