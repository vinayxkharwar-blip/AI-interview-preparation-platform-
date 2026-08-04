import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.HEYGEN_API_KEY;

async function testCombination(url, method, headers, body) {
  console.log(`\n=== Testing ${method} ${url} ===`);
  const maskedHeaders = { ...headers };
  if (maskedHeaders['X-Api-Key']) maskedHeaders['X-Api-Key'] = maskedHeaders['X-Api-Key'].substring(0, 8) + '...';
  if (maskedHeaders['x-api-key']) maskedHeaders['x-api-key'] = maskedHeaders['x-api-key'].substring(0, 8) + '...';
  console.log('Headers:', maskedHeaders);
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    console.log('Status:', res.status, res.statusText);
    console.log('Content-Type:', res.headers.get('content-type'));
    const text = await res.text();
    console.log('Body:', text.substring(0, 400));
  } catch (e) {
    console.error('Fetch Error:', e.message);
  }
}

async function runAll() {
  await testCombination('https://api.heygen.com/v1/streaming.create_token', 'POST', { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' });
  await testCombination('https://api.heygen.com/v1/streaming.create_token', 'POST', { 'x-api-key': apiKey, 'Content-Type': 'application/json' });
  await testCombination('https://api.heygen.com/v1/streaming.new', 'POST', { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' }, { quality: 'medium', avatar_name: 'Wayne_20240711' });
  await testCombination('https://api.liveavatar.com/v1/streaming.create_token', 'POST', { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' });
  await testCombination('https://api.liveavatar.com/v1/streaming.new', 'POST', { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' }, { quality: 'medium' });
  await testCombination('https://api.heygen.com/v1/user/remaining_quota', 'GET', { 'X-Api-Key': apiKey });
}

runAll();
