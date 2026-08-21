import express from 'express';
import mongoose from 'mongoose';
import { registerUser, loginUser, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/authRateLimiter.js';

const router = express.Router();

router.post('/register', authRateLimiter, registerUser);
router.post('/signup', authRateLimiter, registerUser); // Alias
router.post('/login', authRateLimiter, loginUser);
router.get('/me', protect, getMe);

export default router;
