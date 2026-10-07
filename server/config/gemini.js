// Deprecated: Gemini configuration replaced with OpenAI
import { isOpenAIConfigured, openaiClient } from './openai.js';

export const isGeminiConfigured = isOpenAIConfigured;
export const genAIClient = openaiClient;
