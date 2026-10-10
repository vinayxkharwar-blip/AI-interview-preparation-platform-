import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
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
import { globalApiLimiter } from './middleware/rateLimiter.js';
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

  if (!openaiKey || !openaiKey.trim() || openaiKey === 'your_openai_api_key_here') {
    warnings.push('OPENAI_API_KEY: Missing (AI evaluations, STT, and TTS will fallback gracefully to heuristics)');
  }

  const livekitKey = process.env.LIVEKIT_API_KEY;
  const livekitSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;

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
    console.warn(`   (To enable full LiveKit media streaming, update server/.env with valid credentials)\n`);
  } else {
    console.log(`✅ [Environment Check] All environment credentials successfully loaded.`);
  }
};

validateEnv();

const app = express();

// Connect to MongoDB (skip if running lightweight tests)
if (!process.env.TEST_MODE) {
  connectDB();
}

app.use((req, res, next) => {
  req.dbAvailable = mongoose.connection.readyState === 1;
  next();
});

// ==========================================
// CORS Configuration & Normalization
// ==========================================
const normalizeOrigin = (url) => {
  if (!url || typeof url !== 'string') return '';
  return url.trim().replace(/\/+$/, '');
};

// Known default production and local development origins
const DEFAULT_ALLOWED_ORIGINS = [
  'https://ai-interview-preparation-platform-two.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

// Helper to parse comma-separated or space-separated origins from environment variables
const parseEnvOrigins = (...envVars) => {
  const origins = [];
  for (const envVal of envVars) {
    if (envVal && typeof envVal === 'string') {
      envVal
        .split(',')
        .map((item) => normalizeOrigin(item))
        .filter(Boolean)
        .forEach((origin) => origins.push(origin));
    }
  }
  return origins;
};

export const getAllowedOrigins = () => {
  const envOrigins = parseEnvOrigins(
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    process.env.ALLOWED_ORIGINS
  );
  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS.map(normalizeOrigin), ...envOrigins]));
};

export const isOriginAllowed = (origin, allowedList) => {
  if (!origin) return true; // Requests without Origin header (curl, mobile apps, server-to-server)
  const normalized = normalizeOrigin(origin).toLowerCase();

  // Check against normalized allowed list
  if (allowedList.some((allowed) => normalizeOrigin(allowed).toLowerCase() === normalized)) {
    return true;
  }

  // Safe pattern match for Vercel preview/branch deployments of this platform
  if (/^https:\/\/ai-interview-preparation-platform[a-z0-9-]*\.vercel\.app$/.test(normalized)) {
    return true;
  }

  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without Origin header (curl, mobile apps, server-to-server, same-origin)
    if (!origin) {
      return callback(null, true);
    }

    const currentAllowedOrigins = getAllowedOrigins();
    if (isOriginAllowed(origin, currentAllowedOrigins)) {
      console.log(`[CORS] Request origin allowed: "${origin}"`);
      return callback(null, true);
    }

    // Origin blocked: Log cleanly with exact origin without leaking sensitive data
    console.warn(
      `[CORS] Blocked request from unauthorized origin: "${origin}". Configured allowed origins: [${currentAllowedOrigins.join(', ')}]`
    );
    // Reject cleanly without triggering unhandled 500 server errors
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200,
};

// Register CORS middleware and preflight handlers before routes
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

console.log(`🔒 [CORS Initialized] Allowed origins:`, getAllowedOrigins());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads (for audio files or preview docs)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check (Exempt from API rate limits)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AI Interview Preparation Platform API',
    time: new Date().toISOString(),
  });
});

// Prevent caching of authenticated user data across accounts
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Global API rate limiting (~100 req/min across /api)
app.use('/api', globalApiLimiter);

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

// Global Error Handler
app.use((err, req, res, next) => {
  if (err.message && err.message.includes('CORS')) {
    console.warn(`[CORS Error Handler] ${err.message}`);
    return res.status(403).json({
      error: 'CORS Forbidden',
      message: err.message,
    });
  }

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

const isDirectRun = !process.argv[1] || 
  process.argv[1].endsWith('server.js') || 
  path.resolve(process.argv[1]).toLowerCase() === path.resolve(__filename).toLowerCase();

if (isDirectRun && !process.env.NO_AUTO_START) {
  startServer(Number(PORT));
}

export { app, startServer };
export default app;
