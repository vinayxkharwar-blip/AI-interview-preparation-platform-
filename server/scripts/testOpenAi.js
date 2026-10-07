import { generateLLMJson } from '../services/llmService.js';

async function test() {
  console.log('Testing OpenAI LLM generation...');
  const res = await generateLLMJson('Generate 1 mock question with keys questionText and category');
  console.log('Result:', res);
}

test().catch(console.error);
