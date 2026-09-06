import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { openaiClient } from '../config/openai.js';

async function fetchModels() {
  try {
    if (!openaiClient) {
      console.error('OPENAI_API_KEY is not configured.');
      return;
    }
    const models = await openaiClient.models.list();
    console.log(JSON.stringify(models.data.map(m => m.id), null, 2));
  } catch (err) {
    console.error('Fetch models error:', err.message);
  }
}

fetchModels();
