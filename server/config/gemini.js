import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = (process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY || '').trim();

export const isGeminiConfigured = Boolean(
  apiKey && 
  apiKey !== 'your_gemini_api_key_here' && 
  apiKey.length > 5
);

export const genAIClient = isGeminiConfigured ? new GoogleGenerativeAI(apiKey) : null;
