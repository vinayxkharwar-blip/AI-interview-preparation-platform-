import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createLiveKitToken,
  handleLiveTurn,
  completeLiveSession,
} from '../controllers/liveInterviewController.js';

const router = express.Router({ mergeParams: true });

router.post('/token', protect, createLiveKitToken);
router.post('/turn', protect, handleLiveTurn);
router.post('/complete', protect, completeLiveSession);

export default router;
