import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { synthesizeGeminiSpeech } from '../services/ttsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  console.log('Testing synthesizeGeminiSpeech directly with current GEMINI_API_KEY...');
  try {
    const result = await synthesizeGeminiSpeech('Hello, welcome to your technical mock interview with Alex.', 'Puck');
    console.log('Success! Result metadata:');
    console.log('Audio base64 length:', result.audioBase64?.length);
    console.log('Mime type:', result.mimeType);
    console.log('Model:', result.model);
    console.log('Voice:', result.voiceName);
  } catch (err) {
    console.error('DIAGNOSTIC FAILURE:', err);
  }
}

run();
