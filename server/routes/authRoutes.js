import express from 'express';
import mongoose from 'mongoose';
import { registerUser, loginUser, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Middleware check to prevent race condition when DB connection is not ready (readyState !== 1)
const checkDbReady = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    console.warn(`[DB Notice] Request rejected: Database connection not ready (readyState: ${mongoose.connection.readyState})`);
    return res.status(503).json({ message: 'Database not ready' });
  }
  next();
};

router.post('/register', registerUser);
router.post('/signup', registerUser); // Alias
router.post('/login', checkDbReady, loginUser);
router.get('/me', protect, getMe);

export default router;
