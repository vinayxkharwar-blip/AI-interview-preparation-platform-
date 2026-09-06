import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : '';

export const isOpenAIConfigured = Boolean(
  apiKey && apiKey !== 'your_openai_api_key_here' && apiKey.length > 10
);

export const openaiClient = isOpenAIConfigured ? new OpenAI({ apiKey }) : null;
