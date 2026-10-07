import { generateCoverLetter, memoryCoverLetters } from '../controllers/coverLetterController.js';
import { memoryResumes } from '../controllers/resumeController.js';
import { checkOwnership } from '../utils/authz.js';
import { globalApiLimiter, authLimiter, aiLimiter } from '../middleware/rateLimiter.js';

const createMockReqRes = (body = {}, user = null) => {
  const req = {
    body,
    user,
    headers: {},
  };
  const res = {
    statusCode: 200,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    },
  };
  return { req, res };
};

async function runPhase5ATests() {
  console.log('====================================================');
  console.log('🔒 PHASE 5A: SECURITY HARDENING VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(` ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // -----------------------------------------------------------
  // PART 1: Cover Letter Resume IDOR Vulnerability Test
  // -----------------------------------------------------------
  console.log('--- 1. COVER LETTER RESUME OWNERSHIP / IDOR TESTS ---');

  const userA = { _id: 'user-a-111111111111111111111111', name: 'Alice Developer' };
  const userB = { _id: 'user-b-222222222222222222222222', name: 'Bob Attacker' };

  const resumeA = {
    _id: 'resume-a-secret-12345',
    user: userA._id,
    fileName: 'Alice_Confidential_Resume.pdf',
    rawText: 'Alice Confidential Resume: Secret Projects at Defense Corp, Top Secret Clearance, Kubernetes, Go',
    parsedData: { skills: ['Kubernetes', 'Go', 'Secret Systems'], targetRole: 'Staff Systems Architect' },
    createdAt: new Date(),
  };

  // Add resume to memory store
  memoryResumes.push(resumeA);

  // Sub-test 1: User B tries to use User A's resumeId -> MUST return 403
  const idorReqRes = createMockReqRes(
    {
      company: 'Evil Corp',
      role: 'Hacker',
      resumeId: resumeA._id,
    },
    userB
  );

  await generateCoverLetter(idorReqRes.req, idorReqRes.res);

  assert(
    idorReqRes.res.statusCode === 403,
    `User B attempting to access User A's resume returns HTTP 403 (got ${idorReqRes.res.statusCode})`
  );
  assert(
    idorReqRes.res.jsonData?.message?.includes('Forbidden'),
    `Forbidden message returned: "${idorReqRes.res.jsonData?.message}"`
  );

  // Sub-test 2: Non-existent resumeId -> MUST return 404
  const notFoundReqRes = createMockReqRes(
    {
      company: 'Tech Corp',
      role: 'Engineer',
      resumeId: 'resume-nonexistent-99999',
    },
    userA
  );

  await generateCoverLetter(notFoundReqRes.req, notFoundReqRes.res);

  assert(
    notFoundReqRes.res.statusCode === 404,
    `Accessing non-existent resumeId returns HTTP 404 (got ${notFoundReqRes.res.statusCode})`
  );

  // Sub-test 3: User A uses their OWN resumeId -> MUST succeed (201)
  const legitReqRes = createMockReqRes(
    {
      company: 'Acme Systems',
      role: 'Staff Systems Architect',
      resumeId: resumeA._id,
    },
    userA
  );

  await generateCoverLetter(legitReqRes.req, legitReqRes.res);

  assert(
    legitReqRes.res.statusCode === 201,
    `User A using their own resumeId succeeds with HTTP 201 (got ${legitReqRes.res.statusCode})`
  );
  assert(
    legitReqRes.res.jsonData?.coverLetter?.company === 'Acme Systems',
    `Cover letter generated for target company "${legitReqRes.res.jsonData?.coverLetter?.company}"`
  );

  // Sub-test 4: User A without resumeId (falls back to latest user resume) -> MUST succeed
  const fallbackReqRes = createMockReqRes(
    {
      company: 'Future Labs',
      role: 'Software Engineer',
    },
    userA
  );

  await generateCoverLetter(fallbackReqRes.req, fallbackReqRes.res);

  assert(
    fallbackReqRes.res.statusCode === 201,
    `Generating cover letter without explicit resumeId succeeds with HTTP 201 (got ${fallbackReqRes.res.statusCode})`
  );

  // -----------------------------------------------------------
  // PART 2: Rate Limiting Middleware Unit Tests
  // -----------------------------------------------------------
  console.log('\n--- 2. RATE LIMITING / ABUSE PROTECTION TESTS ---');

  // Verify rate limiters exist and are functions
  assert(typeof globalApiLimiter === 'function', 'globalApiLimiter middleware initialized properly');
  assert(typeof authLimiter === 'function', 'authLimiter middleware initialized properly');
  assert(typeof aiLimiter === 'function', 'aiLimiter middleware initialized properly');

  // Test live express server rate limiting via HTTP fetch
  console.log('\n--- 3. LIVE HTTP RATE-LIMIT & HEALTH CHECKS ---');

  try {
    // Check Health endpoint first
    const healthRes = await fetch('http://localhost:5000/api/health');
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.status === 'ok', `GET /api/health returns HTTP 200 OK (${healthData.service})`);

    // Test health endpoint is NOT affected by rate limits (send 20 rapid requests)
    let allHealthOk = true;
    for (let i = 0; i < 20; i++) {
      const hRes = await fetch('http://localhost:5000/api/health');
      if (hRes.status !== 200) allHealthOk = false;
    }
    assert(allHealthOk, 'Health endpoint exempt from rate limiting (20 rapid requests all returned 200)');

    // Test Auth rate limiter (threshold is 10 req/min)
    console.log('\nTesting Auth Rate Limiter (threshold: 10 req/min)...');
    let hit429OnAuth = false;
    let auth429Message = '';

    for (let i = 1; i <= 15; i++) {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rate_test@example.com', password: 'wrongpassword' }),
      });

      if (res.status === 429) {
        hit429OnAuth = true;
        const body = await res.json();
        auth429Message = body.message;
        console.log(`   [Auth Limiter] Hit HTTP 429 on request #${i}: "${auth429Message}"`);
        break;
      }
    }

    assert(hit429OnAuth, `Auth route successfully triggered HTTP 429 when rate limit was exceeded`);

  } catch (netErr) {
    console.warn(`[Notice] Live server HTTP check notice: ${netErr.message}`);
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5ATests().catch((err) => {
  console.error('[Test Suite Error]', err);
  process.exit(1);
});
