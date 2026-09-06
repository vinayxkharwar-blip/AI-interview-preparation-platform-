import fs from 'fs';
import path from 'path';
import { genAIClient, isGeminiConfigured } from '../config/gemini.js';

const MIME_BY_EXT = {
  '.webm': 'audio/webm',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mp3',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
};

const transcribeWithGemini = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = MIME_BY_EXT[ext] || 'audio/webm';
  const audioBase64 = fs.readFileSync(filePath).toString('base64');

  const model = genAIClient.getGenerativeModel({ model: 'gemini-3.6-flash' });
  const result = await model.generateContent([
    { text: 'Transcribe this audio exactly as spoken. Return ONLY the raw transcript text, no commentary, no quotes.' },
    { inlineData: { mimeType, data: audioBase64 } },
  ]);
  return result.response.text().trim();
};

export const transcribeAudio = async (filePath) => {
  try {
    if (isGeminiConfigured && genAIClient) {
      return await transcribeWithGemini(filePath);
    }
    throw new Error('Gemini STT is not configured (GEMINI_API_KEY missing).');
  } catch (error) {
    console.error('[STT Service Error]', error.message);
    return "Sorry, I couldn't transcribe that answer clearly — could you repeat it?";
  }
};

