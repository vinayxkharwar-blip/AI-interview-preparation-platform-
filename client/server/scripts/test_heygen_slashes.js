import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.HEYGEN_API_KEY;

const urlsToTest = [
  'https://api.heygen.com/v1/streaming/new',
  'https://api.heygen.com/v1/streaming/create_token',
  'https://api.heygen.com/v1/streaming.new',
  'https://api.heygen.com/v1/streaming.create_token',
  'https://api.heygen.com/v2/streaming/new',
  'https://api.heygen.com/v2/streaming.new',
];

async function run() {
  for (const url of urlsToTest) {
    console.log(`\nTesting POST ${url}`);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ quality: 'medium', avatar_name: 'Wayne_20240711' }),
      });
      console.log('Status:', res.status, res.statusText);
      console.log('Content-Type:', res.headers.get('content-type'));
      const text = await res.text();
      console.log('Body:', text.substring(0, 300));
    } catch (e) {
      console.error('Error:', e.message);
    }
  }
}

run();
