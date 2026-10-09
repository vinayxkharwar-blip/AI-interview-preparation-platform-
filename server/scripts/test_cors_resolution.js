process.env.TEST_MODE = 'true';
process.env.NO_AUTO_START = 'true';

import http from 'http';
const { app, getAllowedOrigins, isOriginAllowed } = await import('../server.js');

console.log('--- Testing CORS Origin Resolution & Validation ---');

const allowedList = getAllowedOrigins();
console.log('Configured Allowed Origins:', allowedList);

const testCases = [
  { origin: 'https://ai-interview-preparation-platform-two.vercel.app', expected: true, desc: 'Production Vercel frontend' },
  { origin: 'https://ai-interview-preparation-platform-two.vercel.app/', expected: true, desc: 'Production Vercel frontend with trailing slash' },
  { origin: 'http://localhost:5173', expected: true, desc: 'Localhost Vite' },
  { origin: 'http://localhost:3000', expected: true, desc: 'Localhost React/Next' },
  { origin: 'http://127.0.0.1:5173', expected: true, desc: '127.0.0.1 Vite' },
  { origin: 'http://localhost:4173', expected: true, desc: 'Localhost preview' },
  { origin: '', expected: true, desc: 'Empty origin (server-to-server / curl)' },
  { origin: null, expected: true, desc: 'Null origin (mobile / curl)' },
  { origin: 'https://ai-interview-preparation-platform-git-test.vercel.app', expected: true, desc: 'Platform Vercel preview branch' },
  { origin: 'https://malicious-site.com', expected: false, desc: 'Malicious origin' },
  { origin: 'https://attacker.vercel.app', expected: false, desc: 'Unrelated Vercel app' },
];

let allPassed = true;
for (const tc of testCases) {
  const result = isOriginAllowed(tc.origin, allowedList);
  const passed = result === tc.expected;
  if (!passed) allPassed = false;
  console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: [${tc.desc}] origin: "${tc.origin}" -> ${result} (expected ${tc.expected})`);
}

// -------------------------------------------------------------
// Live HTTP Preflight & Request Test
// -------------------------------------------------------------
console.log('\n--- Testing Live HTTP Request & OPTIONS Preflight via Express ---');

const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;

try {
  // Test 1: OPTIONS Preflight from production Vercel frontend
  const preflightRes = await fetch(`${baseUrl}/api/health`, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://ai-interview-preparation-platform-two.vercel.app',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type,Authorization',
    },
  });

  const preflightAllowOrigin = preflightRes.headers.get('access-control-allow-origin');
  const preflightAllowCredentials = preflightRes.headers.get('access-control-allow-credentials');
  const preflightAllowMethods = preflightRes.headers.get('access-control-allow-methods');
  const preflightStatus = preflightRes.status;

  const preflightPassed = 
    (preflightStatus === 200 || preflightStatus === 204) &&
    preflightAllowOrigin === 'https://ai-interview-preparation-platform-two.vercel.app' &&
    preflightAllowCredentials === 'true' &&
    preflightAllowMethods?.includes('POST');

  if (preflightPassed) {
    console.log(`✅ PASS: OPTIONS Preflight: Status ${preflightStatus}, Origin ${preflightAllowOrigin}, Credentials ${preflightAllowCredentials}`);
  } else {
    console.error(`❌ FAIL: OPTIONS Preflight failed: Status ${preflightStatus}, Origin ${preflightAllowOrigin}`);
    allPassed = false;
  }

  // Test 2: Actual GET request from production Vercel frontend
  const getRes = await fetch(`${baseUrl}/api/health`, {
    method: 'GET',
    headers: {
      'Origin': 'https://ai-interview-preparation-platform-two.vercel.app',
    },
  });

  const getAllowOrigin = getRes.headers.get('access-control-allow-origin');
  const getJson = await getRes.json();
  const getPassed = getRes.status === 200 && getAllowOrigin === 'https://ai-interview-preparation-platform-two.vercel.app' && getJson.status === 'ok';

  if (getPassed) {
    console.log(`✅ PASS: GET /api/health from allowed origin returned 200 with Access-Control-Allow-Origin: ${getAllowOrigin}`);
  } else {
    console.error(`❌ FAIL: GET /api/health failed: Status ${getRes.status}, Origin ${getAllowOrigin}`);
    allPassed = false;
  }

  // Test 3: Unauthorized origin request (should NOT have Access-Control-Allow-Origin, should NOT trigger 500 error)
  const blockedRes = await fetch(`${baseUrl}/api/health`, {
    method: 'GET',
    headers: {
      'Origin': 'https://malicious-attacker.com',
    },
  });

  const blockedAllowOrigin = blockedRes.headers.get('access-control-allow-origin');
  const blockedStatus = blockedRes.status;
  // Origin should NOT be allowed: header must be null, and status must not be 500
  const blockedPassed = blockedAllowOrigin === null && blockedStatus !== 500;

  if (blockedPassed) {
    console.log(`✅ PASS: Request from unauthorized origin cleanly denied CORS headers without server 500 crash (Status: ${blockedStatus}, Allow-Origin: ${blockedAllowOrigin})`);
  } else {
    console.error(`❌ FAIL: Unauthorized origin was not handled cleanly: Status ${blockedStatus}, Allow-Origin ${blockedAllowOrigin}`);
    allPassed = false;
  }
} catch (err) {
  console.error('Test error:', err);
  allPassed = false;
} finally {
  await new Promise((resolve) => server.close(resolve));
}

if (allPassed) {
  console.log('\n🎉 ALL CORS TESTS (UNIT & HTTP INTEGRATION) PASSED SUCCESSFULLY!');
} else {
  console.error('\n❌ SOME CORS TESTS FAILED!');
  process.exitCode = 1;
}

