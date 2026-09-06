import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function fetchModels() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not configured.');
      return;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    console.log('Gemini client initialized with provided key.');
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const result = await model.generateContent('ping');
    console.log('Gemini model test success:', result.response.text());
  } catch (err) {
    console.error('Fetch models error:', err.message);
  }
}

fetchModels();
