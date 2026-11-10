import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import sessionRoutes from '../routes/sessionRoutes.js';
import { performance } from 'perf_hooks';

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const benchmark = async () => {
  console.log('===========================================================');
  console.log('DIAGNOSTIC BENCHMARK: POST /api/sessions/start PERFORMANCE');
  console.log('===========================================================');

  await connectDB();
  console.log('✅ Connected to MongoDB Atlas.\n');

  const app = express();
  app.use(express.json());
  app.use('/api/sessions', sessionRoutes);

  const server = app.listen(5098);
  const BASE_URL = 'http://localhost:5098/api/sessions';

  let testUser = await User.findOne({ email: 'perf_test_user@prepilot.ai' });
  if (!testUser) {
    testUser = await User.create({
      name: 'Performance Test User',
      email: 'perf_test_user@prepilot.ai',
      password: 'PerfPassword123!',
      targetRole: 'Full Stack Engineer',
      role: 'user',
    });
  }

  const token = jwt.sign({ id: testUser._id, email: testUser.email }, JWT_SECRET, { expiresIn: '1h' });

  console.log('Initiating POST /api/sessions/start request...');
  const tStart = performance.now();

  const response = await fetch(`${BASE_URL}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      targetRole: 'Full Stack Engineer',
      interviewType: 'technical',
      difficulty: 'mid',
      count: 5,
    }),
  });

  const tEnd = performance.now();
  const totalElapsed = tEnd - tStart;
  const data = await response.json();

  console.log(`\nHTTP Status: ${response.status}`);
  console.log(`Total Response Time: ${totalElapsed.toFixed(2)} ms (${(totalElapsed / 1000).toFixed(2)} s)`);
  console.log(`Session ID created: ${data.session?._id}`);
  console.log(`Questions returned: ${data.questions?.length}`);

  server.close();
  process.exit(0);
};

benchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});

