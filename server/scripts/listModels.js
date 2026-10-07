import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { openaiClient, isOpenAIConfigured } from '../config/openai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function fetchModels() {
  try {
    if (!isOpenAIConfigured || !openaiClient) {
      console.error('OPENAI_API_KEY is not configured.');
      return;
    }
    console.log('OpenAI client initialized with provided key.');
    const list = await openaiClient.models.list();
    const gptModels = list.data
      .map((m) => m.id)
      .filter((id) => id.includes('gpt') || id.includes('whisper') || id.includes('tts'))
      .sort();
    console.log(`Available relevant models (${gptModels.length}):`, gptModels.slice(0, 20));
  } catch (err) {
    console.error('Fetch models error:', err.message);
  }
}

fetchModels();
