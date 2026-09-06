import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import resumeRoutes from './routes/resumeRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import answerRoutes from './routes/answerRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import coverLetterRoutes from './routes/coverLetterRoutes.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import fs from 'fs';

dotenv.config({ path: path.join(__dirname, '.env') });

const validateEnv = () => {
  const jwtSecret = process.env.JWT_SECRET;
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  const openaiKey = process.env.OPENAI_API_KEY;
  const port = process.env.PORT;

  // Hard failure checks
  if (!jwtSecret || !jwtSecret.trim()) {
    console.error('❌ [Environment FATAL Error] JWT_SECRET is missing or undefined! Server cannot start without a configured JWT_SECRET.');
    process.exit(1);
  }

  if (!mongoUri || !mongoUri.trim()) {
    console.error('❌ [Environment FATAL Error] MONGO_URI (or MONGODB_URI) is missing! Server cannot start without a database connection string.');
    process.exit(1);
  }

  // Soft warning checks
  const warnings = [];

  if (!port) {
    warnings.push('PORT: Missing from environment variables (defaulting to 5000)');
  }

  if (!openaiKey || !openaiKey.trim()) {
    warnings.push('OPENAI_API_KEY: Missing (AI evaluations and question generation will fallback gracefully to heuristic evaluation)');
  }

  const heygenKey = process.env.HEYGEN_API_KEY;
  const livekitKey = process.env.LIVEKIT_API_KEY;
  const livekitSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;

  if (!heygenKey || heygenKey === 'your_heygen_api_key' || heygenKey.includes('••••')) {
    warnings.push('HEYGEN_API_KEY: Missing or placeholder (HeyGen Real-Time Avatar will fall back to animated visualizer & Web Speech API)');
  }
  if (!livekitKey || livekitKey === 'your_livekit_api_key') {
    warnings.push('LIVEKIT_API_KEY: Missing or placeholder');
  }
  if (!livekitSecret || livekitSecret === 'your_livekit_secret' || livekitSecret.includes('••••')) {
    warnings.push('LIVEKIT_API_SECRET: Missing, default, or contains bullet placeholders (••••)');
  }
  if (!livekitUrl || livekitUrl.includes('cloudse')) {
    warnings.push('LIVEKIT_URL: Missing or malformed');
  }

  if (warnings.length > 0) {
    console.warn(`\n⚠️  [Environment Configuration Warnings]`);
    warnings.forEach((w) => console.warn(`   - ${w}`));
    console.warn(`   (To enable full LiveKit & HeyGen Avatar streaming, update server/.env with valid credentials)\n`);
  } else {
    console.log(`✅ [Environment Check] All environment credentials successfully loaded.`);
  }
};

validateEnv();

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy restriction: Request origin not allowed.'));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads (for audio files or preview docs)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/cover-letter', coverLetterRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AI Interview Preparation Platform API',
    time: new Date().toISOString(),
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

let PORT = process.env.PORT || 5000;

const startServer = (portToTry) => {
  const server = app.listen(portToTry, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 AI Interview Server running on http://localhost:${portToTry}`);
    console.log(`====================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Port Notice] Port ${portToTry} is already in use. Retrying on port ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      console.error('[Server Error]', err);
    }
  });
};

startServer(Number(PORT));

