import dns from 'dns';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  // DNS fallback
}

const BASE_URL = 'http://127.0.0.1:5000/api';

const apiFetch = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'x-test-mode': 'true',
    ...(options.headers || {}),
  };
  return fetch(url, { ...options, headers });
};

async function runAuthApiTests() {
  console.log('====================================================');
  console.log('🔒 AUTHENTICATION & EMAIL VALIDATION API TEST SUITE');
  console.log('====================================================\n');

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

  // --- 1. INVALID EMAIL FORMAT TESTS (LOGIN) ---
  console.log('--- 1. INVALID EMAIL FORMATS ON LOGIN ---');
  const invalidEmails = ['a@', 'abc', 'a@@b.com', 'a@b', '@gmail.com', 'user@domain..com', 'plainaddress'];

  for (const badEmail of invalidEmails) {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: badEmail, password: 'password123' }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.message === 'Please enter a valid email address.',
      `Login rejects invalid email "${badEmail}" with HTTP 400`,
      `Status: ${res.status}, Message: "${data.message}"`
    );
  }

  // --- 2. INVALID EMAIL FORMAT TESTS (REGISTER) ---
  console.log('\n--- 2. INVALID EMAIL FORMATS ON REGISTER ---');
  for (const badEmail of invalidEmails) {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Candidate', email: badEmail, password: 'password123' }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.message === 'Please enter a valid email address.',
      `Register rejects invalid email "${badEmail}" with HTTP 400`,
      `Status: ${res.status}, Message: "${data.message}"`
    );
  }

  // --- 3. EMPTY AND MISSING FIELDS ---
  console.log('\n--- 3. EMPTY & MISSING FIELDS VALIDATION ---');
  
  // Login missing email
  const loginNoEmail = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password: 'password123' }),
  });
  const dataLoginNoEmail = await loginNoEmail.json();
  assert(
    loginNoEmail.status === 400 && dataLoginNoEmail.message === 'Please provide email and password.',
    'Login without email returns HTTP 400 with "Please provide email and password."',
    `Status: ${loginNoEmail.status}, Message: "${dataLoginNoEmail.message}"`
  );

  // Login missing password
  const loginNoPass = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'test@example.com' }),
  });
  const dataLoginNoPass = await loginNoPass.json();
  assert(
    loginNoPass.status === 400 && dataLoginNoPass.message === 'Please provide email and password.',
    'Login without password returns HTTP 400 with "Please provide email and password."',
    `Status: ${loginNoPass.status}, Message: "${dataLoginNoPass.message}"`
  );

  // Login with whitespace-only email
  const loginWhitespaceEmail = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: '   ', password: 'password123' }),
  });
  const dataLoginWhitespace = await loginWhitespaceEmail.json();
  assert(
    loginWhitespaceEmail.status === 400,
    'Login with empty/whitespace email returns HTTP 400',
    `Status: ${loginWhitespaceEmail.status}`
  );

  // Register missing name
  const regNoName = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: 'valid@example.com', password: 'password123' }),
  });
  const dataRegNoName = await regNoName.json();
  assert(
    regNoName.status === 400 && dataRegNoName.message === 'Please enter all required fields.',
    'Register without name returns HTTP 400 with "Please enter all required fields."',
    `Status: ${regNoName.status}, Message: "${dataRegNoName.message}"`
  );

  // Register password too short
  const regShortPass = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Short Pass User', email: 'valid2@example.com', password: '123' }),
  });
  const dataRegShortPass = await regShortPass.json();
  assert(
    regShortPass.status === 400 && dataRegShortPass.message === 'Password must be at least 6 characters long.',
    'Register with password < 6 chars returns HTTP 400 with "Password must be at least 6 characters long."',
    `Status: ${regShortPass.status}, Message: "${dataRegShortPass.message}"`
  );

  // --- 4. UNKNOWN ACCOUNTS (GENERIC 401 AUTH ERROR - NO USER ENUMERATION) ---
  console.log('\n--- 4. UNKNOWN ACCOUNTS & INCORRECT CREDENTIALS ---');
  const unknownEmail = `unknown_candidate_${Date.now()}@example.com`;
  const unknownRes = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: unknownEmail, password: 'password123' }),
  });
  const unknownData = await unknownRes.json();
  assert(
    unknownRes.status === 401 && unknownData.message === 'Invalid email or password.',
    'Unknown account returns HTTP 401 with generic "Invalid email or password." (no account leakage)',
    `Status: ${unknownRes.status}, Message: "${unknownData.message}"`
  );

  // --- 5. REGISTRATION, LOGIN, NORMALIZATION & PASSWORD CHECKS ---
  console.log('\n--- 5. FULL AUTH LIFECYCLE WITH EMAIL NORMALIZATION ---');
  const testEmailRaw = `  Candidate_${Date.now()}@Example.COM   `;
  const normalizedExpected = testEmailRaw.trim().toLowerCase();
  const testPassword = 'SecurePassword!123';
  const testName = 'Ada Lovelace';

  // Register user with leading/trailing whitespace & uppercase email
  const regRes = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: `  ${testName}  `,
      email: testEmailRaw,
      password: testPassword,
      targetRole: 'Senior AI Engineer',
    }),
  });
  const regData = await regRes.json();
  assert(
    regRes.status === 201 && regData.token && regData.user.email === normalizedExpected,
    `Registration succeeds (201) and normalizes email to "${normalizedExpected}"`,
    `Status: ${regRes.status}, User Email: "${regData.user?.email}"`
  );

  // Duplicate registration must return 400
  const dupRes = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: testName,
      email: normalizedExpected,
      password: testPassword,
    }),
  });
  const dupData = await dupRes.json();
  assert(
    dupRes.status === 400 && dupData.message.includes('already exists'),
    `Duplicate email registration returns HTTP 400 ("${dupData.message}")`,
    `Status: ${dupRes.status}`
  );

  // Login with WRONG password on the existing account
  const wrongPassRes = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: normalizedExpected,
      password: 'IncorrectPassword999',
    }),
  });
  const wrongPassData = await wrongPassRes.json();
  assert(
    wrongPassRes.status === 401 && wrongPassData.message === 'Invalid email or password.',
    'Wrong password returns exact same generic HTTP 401 message as non-existent user',
    `Status: ${wrongPassRes.status}, Message: "${wrongPassData.message}"`
  );

  // Login with CORRECT credentials and messy email casing/whitespace
  const loginRes = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmailRaw,
      password: testPassword,
    }),
  });
  const loginData = await loginRes.json();
  assert(
    loginRes.status === 200 && loginData.token && loginData.user.email === normalizedExpected,
    'Login with whitespace & mixed-case email succeeds with HTTP 200 and valid JWT token',
    `Status: ${loginRes.status}`
  );

  const token = loginData.token;

  // --- 6. JWT VERIFICATION & PROTECTED ROUTE ---
  console.log('\n--- 6. JWT VERIFICATION & PROTECTED ROUTES ---');
  const meRes = await apiFetch('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meData = await meRes.json();
  assert(
    meRes.status === 200 && meData.user && meData.user.email === normalizedExpected,
    'GET /api/auth/me returns HTTP 200 with authenticated user profile',
    `Status: ${meRes.status}`
  );

  // Protected route with invalid token
  const badTokenRes = await apiFetch('/auth/me', {
    headers: { Authorization: `Bearer invalid.jwt.token` },
  });
  assert(
    badTokenRes.status === 401,
    'GET /api/auth/me with forged/invalid token returns HTTP 401',
    `Status: ${badTokenRes.status}`
  );

  // Protected route without token
  const noTokenRes = await apiFetch('/auth/me');
  assert(
    noTokenRes.status === 401,
    'GET /api/auth/me without token returns HTTP 401',
    `Status: ${noTokenRes.status}`
  );

  // --- 7. CLEANUP TEST USER ---
  try {
    const mongoose = (await import('mongoose')).default;
    await mongoose.connect(process.env.MONGO_URI);
    await mongoose.connection.db.collection('users').deleteOne({ email: normalizedExpected });
    await mongoose.disconnect();
    console.log(`\n🧹 Cleaned up temporary test user: "${normalizedExpected}"`);
  } catch (cleanupErr) {
    console.warn('Test user cleanup notice:', cleanupErr.message);
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthApiTests().catch((err) => {
  console.error('[API Test Suite Fatal Error]', err);
  process.exit(1);
});
