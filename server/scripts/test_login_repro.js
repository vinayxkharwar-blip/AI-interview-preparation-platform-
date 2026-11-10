import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { app } from '../server.js';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  console.log('Connecting to mongoose...');
  const mongoUri = process.env.MONGO_URI;
  let checks = 0;
  while (mongoose.connection.readyState !== 1 && checks < 20) {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
    }
    await new Promise((r) => setTimeout(r, 500));
    checks++;
  }
  console.log('MongoDB connected successfully. ReadyState:', mongoose.connection.readyState);

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(` ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${message} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  // Start app on a random free test port to test via HTTP
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`Test server running on port ${port}\n`);

  const callLogin = async (body, headers = {}) => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-mode': 'true',
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch (e) {}
    return { status: res.status, headers: res.headers, text, data };
  };

  // Test 1: Invalid email format
  console.log('--- Test 1: Invalid email format ---');
  const res1 = await callLogin({ email: 'invalid_email_format', password: 'password123' });
  assert(res1.status === 400 && res1.data.message === 'Please enter a valid email address.', 'Invalid email format returns HTTP 400', `Status: ${res1.status}`);

  // Test 2: Missing fields
  console.log('\n--- Test 2: Missing email / password ---');
  const res2 = await callLogin({ email: '' });
  assert(res2.status === 400, 'Missing password returns HTTP 400', `Status: ${res2.status}`);

  // Test 3: Non-existent account
  console.log('\n--- Test 3: Unknown account ---');
  const res3 = await callLogin({ email: `unknown_candidate_${Date.now()}@example.com`, password: 'password123' });
  assert(res3.status === 401 && res3.data.message === 'Invalid email or password.', 'Unknown account returns generic 401', `Status: ${res3.status}`);

  // Test 4: Existing account with correct password
  console.log('\n--- Test 4: Existing account verification ---');
  // Create or reuse an existing account
  const existingEmail = 'existing_test_account@example.com';
  const existingPassword = 'SecurePassword!123';
  await User.deleteOne({ email: existingEmail });
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(existingPassword, salt);
  await User.create({
    name: 'Existing Account Test',
    email: existingEmail,
    password: hashedPassword,
    targetRole: 'Full Stack Engineer',
    role: 'user',
  });

  // Login with WRONG password on existing account
  const resWrong = await callLogin({ email: existingEmail, password: 'WrongPassword999' });
  assert(resWrong.status === 401 && resWrong.data.message === 'Invalid email or password.', 'Existing account with wrong password returns 401', `Status: ${resWrong.status}`);

  // Login with CORRECT password on existing account
  const resCorrect = await callLogin({ email: existingEmail, password: existingPassword });
  assert(resCorrect.status === 200 && resCorrect.data.token && resCorrect.data.user.email === existingEmail, 'Existing account with correct password returns HTTP 200 + token', `Status: ${resCorrect.status}, Token: ${!!resCorrect.data.token}`);

  // Test 5: Login with expired Authorization header attached
  console.log('\n--- Test 5: Login with expired Authorization header ---');
  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1NiIsImV4cCI6MTYwMDAwMDAwMH0.fake';
  const resExpiredHeader = await callLogin(
    { email: existingEmail, password: existingPassword },
    { 'Authorization': `Bearer ${expiredToken}` }
  );
  assert(resExpiredHeader.status === 200 && resExpiredHeader.data.token, 'Expired Authorization header does NOT block or crash login (returns 200)', `Status: ${resExpiredHeader.status}`);

  // Test 6: Fresh account registration and login lifecycle
  console.log('\n--- Test 6: Fresh account registration & login ---');
  const freshEmail = `fresh_test_${Date.now()}@example.com`;
  const freshPassword = 'FreshPassword789!';
  const freshReg = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-test-mode': 'true' },
    body: JSON.stringify({ name: 'Fresh Test User', email: freshEmail, password: freshPassword }),
  });
  const regData = await freshReg.json();
  assert(freshReg.status === 201 && regData.token, 'Fresh account registered successfully (201)', `Status: ${freshReg.status}`);

  const freshLogin = await callLogin({ email: freshEmail, password: freshPassword });
  assert(freshLogin.status === 200 && freshLogin.data.token && freshLogin.data.user.email === freshEmail, 'Fresh account logged in successfully (200)', `Status: ${freshLogin.status}`);

  // Test 7: Null / malformed body
  console.log('\n--- Test 7: Malformed empty request body ---');
  const emptyRes = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-test-mode': 'true' },
    body: '',
  });
  assert(emptyRes.status === 400, 'Empty string body returns HTTP 400 (not 500)', `Status: ${emptyRes.status}`);

  // Clean up
  await User.deleteOne({ email: existingEmail });
  await User.deleteOne({ email: freshEmail });
  await mongoose.disconnect();
  server.close();

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal in test:', err);
  process.exit(1);
});
