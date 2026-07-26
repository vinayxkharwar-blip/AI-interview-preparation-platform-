import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

let geminiClient = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
  geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

export const generateLLMJson = async (prompt, systemMessage = "You are a helpful AI assistant") => {
  if (!geminiClient) {
    console.log('[LLM Service] GEMINI_API_KEY not configured or set to placeholder. Using real...');
    return mockLLMResponse(prompt);
  }

  try {
    const model = geminiClient.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemMessage,
      generationConfig: { responseMimeType: 'application/json' },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    // catch block goes here — need to see your existing one
  }
};