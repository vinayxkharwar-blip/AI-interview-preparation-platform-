import OpenAI from 'openai';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

let openaiClient = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export const transcribeAudio = async (filePath) => {
  if (!openaiClient) {
    console.log('[STT Service] OPENAI_API_KEY not active. Using mock audio transcription fallback.');
    return 'I believe the event loop in JavaScript operates with a call stack and queues. Promises go into the microtask queue, while setTimeout callbacks go into the macrotask queue. The microtasks are always processed first before the next macrotask.';
  }

  try {
    const fileStream = fs.createReadStream(filePath);
    const transcription = await openaiClient.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
      language: 'en',
    });

    return transcription.text;
  } catch (error) {
    console.error('[STT Service Error]', error.message);
    return 'I implemented JWT authentication by generating a signed JWT token on login, returning it to the client, and storing it in LocalStorage or secure cookies. For protected routes, the auth header bearer token is validated.';
  }
};
