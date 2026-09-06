import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateLLMJson } from '../services/llmService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testOpenAI() {
  const prompt = `Return a JSON object with keys: "status", "message"`;
  const result = await generateLLMJson(prompt, "Return valid JSON.");
  console.log('OpenAI Result Meta:', JSON.stringify(result._meta, null, 2));
  console.log('Result:', JSON.stringify(result, null, 2));
}

testOpenAI();
