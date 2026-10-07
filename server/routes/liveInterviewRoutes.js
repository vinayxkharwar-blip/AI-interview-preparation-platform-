import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import {
  createLiveKitToken,
  handleLiveTurn,
  completeLiveSession,
  streamLiveTts,
} from '../controllers/liveInterviewController.js';

const router = express.Router({ mergeParams: true });

router.post('/token', protect, createLiveKitToken);
router.post('/turn', protect, aiLimiter, handleLiveTurn);
router.post('/tts', protect, aiLimiter, streamLiveTts);
router.post('/complete', protect, completeLiveSession);

export default router;
