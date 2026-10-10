import express from 'express';
import mongoose from 'mongoose';
import { registerUser, loginUser, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateRegisterInput, validateLoginInput } from '../middleware/validateAuth.js';

const router = express.Router();

router.post('/register', authLimiter, validateRegisterInput, registerUser);
router.post('/signup', authLimiter, validateRegisterInput, registerUser); // Alias
router.post('/login', authLimiter, validateLoginInput, loginUser);
router.get('/me', protect, getMe);

export default router;
