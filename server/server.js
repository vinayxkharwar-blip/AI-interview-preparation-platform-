import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { execSync } from 'child_process';
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
import placementRoutes from './routes/placementRoutes.js';
import aptitudePYQRoutes from './routes/aptitudePYQRoutes.js';
import adminAptitudeRoutes from './routes/adminAptitudeRoutes.js';
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

// Catch unexpected rejections/exceptions to prevent unhandled node process termination
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Process Unhandled Rejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('❌ [Process Uncaught Exception]', err.stack || err.message);
});

const app = express();

// Trust reverse proxies (Vite dev server, Render, Vercel, Nginx) so rate limiter and IP extraction behave correctly
app.set('trust proxy', 1);

// MongoDB connection state middleware
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

  // Allow any localhost / 127.0.0.1 development port
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) {
    return true;
  }

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
app.use('/api/placement', placementRoutes);
app.use('/api/aptitude', aptitudePYQRoutes);
app.use('/api/admin/aptitude', adminAptitudeRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

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

let PORT = Number(process.env.PORT) || 5000;
let activeServer = null;

const freePortOnWindows = (port) => {
  if (process.platform !== 'win32') return;
  try {
    const netstatOutput = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
    const lines = netstatOutput.split('\r\n');
    let killed = false;
    for (const line of lines) {
      if (line.includes(`:${port}`) && line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== String(process.pid) && pid !== '0') {
          console.log(`[Port Helper] Port ${port} is occupied by PID ${pid}. Terminating conflicting process...`);
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            console.log(`[Port Helper] Successfully terminated PID ${pid} to free port ${port}.`);
            killed = true;
          } catch (killErr) {
            console.warn(`[Port Helper] Could not auto-terminate PID ${pid}: ${killErr.message}`);
          }
        }
      }
    }
    if (killed) {
      const start = Date.now();
      while (Date.now() - start < 1000) {}
    }
  } catch (err) {
    // Ignore netstat errors
  }
};

const attemptListen = (portToTry) => {
  return new Promise((resolve, reject) => {
    const server = app.listen(portToTry, '0.0.0.0', () => {
      activeServer = server;
      const addr = server.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : portToTry;
      console.log(`====================================================`);
      console.log(`🚀 AI Interview Server running on http://localhost:${actualPort}`);
      console.log(`====================================================`);
      resolve(server);
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
};

/**
 * Coordinated Server Startup
 * 1. Automatically frees port 5000 on Windows if an old process holds it
 * 2. Connects to MongoDB Atlas first (with graceful fallback logging)
 * 3. Binds HTTP server to port 5000 on '0.0.0.0' with automatic retry on EADDRINUSE
 * 4. Logs startup banner strictly inside the listen callback with bound port
 * 5. Gracefully manages process lifecycle (SIGINT, SIGTERM)
 */
const startServer = async (portToTry = PORT, maxRetries = 5) => {
  // 1. Free port on Windows if an old process holds it
  freePortOnWindows(portToTry);

  // 2. Coordinate database connection first
  if (!process.env.TEST_MODE && mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (dbErr) {
      console.warn(`[Startup Warning] MongoDB connection encountered error: ${dbErr.message}`);
      console.warn('[Startup Notice] Operating with in-memory fallback store.');
    }
  }

  // 3. Start HTTP listener with retry on EADDRINUSE
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const server = await attemptListen(portToTry);
      return server;
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        if (attempt < maxRetries) {
          console.warn(`⚠️ [Port Notice] Port ${portToTry} is busy. Retrying in 1.5s (attempt ${attempt}/${maxRetries})...`);
          freePortOnWindows(portToTry);
          await new Promise((resolve) => setTimeout(resolve, 1500));
        } else {
          console.error(`❌ [Port Error] Port ${portToTry} is occupied by another process after ${maxRetries} attempts.`);
          console.error(`[Port Help] If an old Node process is still running, run in PowerShell:`);
          console.error(`            Get-Process -Name node | Stop-Process -Force`);
          throw err;
        }
      } else {
        console.error('[Server Error]', err);
        throw err;
      }
    }
  }
};

// Graceful process lifecycle handlers
const handleShutdown = (signal) => {
  console.log(`\n[Process Lifecycle] Received ${signal}. Shutting down cleanly...`);
  if (activeServer) {
    activeServer.close(() => {
      console.log('[Process Lifecycle] HTTP listener closed.');
      if (mongoose.connection.readyState === 1) {
        mongoose.connection.close(false).then(() => {
          console.log('[Process Lifecycle] MongoDB connection closed.');
          process.exit(0);
        }).catch(() => process.exit(0));
      } else {
        process.exit(0);
      }
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

const isDirectRun = (() => {
  if (!process.argv[1]) return true;
  const scriptPath = path.resolve(process.argv[1]).toLowerCase();
  const currentFile = path.resolve(__filename).toLowerCase();
  const currentDir = path.dirname(currentFile).toLowerCase();

  return (
    scriptPath === currentFile ||
    scriptPath === currentDir ||
    scriptPath.endsWith('server.js') ||
    scriptPath.endsWith('server')
  );
})();

if (isDirectRun && !process.env.NO_AUTO_START) {
  startServer(PORT).catch((err) => {
    console.error('❌ [Fatal Startup Error]', err);
  });
}

export { app, startServer };
export default app;
