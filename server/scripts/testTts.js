import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { synthesizeOpenAISpeech } from '../services/ttsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  console.log('Testing synthesizeOpenAISpeech with OpenAI API...');
  try {
    const result = await synthesizeOpenAISpeech('Hello, welcome to your technical mock interview with Alex.', 'alloy');
    console.log('Success! Result metadata:');
    console.log('Audio base64 length:', result.audioBase64?.length);
    console.log('Mime type:', result.mimeType);
    console.log('Model:', result.model);
    console.log('Voice:', result.voiceName);
  } catch (err) {
    console.error('TTS DIAGNOSTIC FAILURE:', err);
  }
}

run();
