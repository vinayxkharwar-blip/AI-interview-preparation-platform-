import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createLiveKitToken,
  handleLiveTurn,
  completeLiveSession,
  createHeyGenStreamSession,
  sendHeyGenSdpAnswer,
  sendHeyGenIceCandidate,
  speakHeyGenTurn,
  stopHeyGenStreamSession,
} from '../controllers/liveInterviewController.js';

const router = express.Router({ mergeParams: true });

router.post('/token', protect, createLiveKitToken);
router.post('/turn', protect, handleLiveTurn);
router.post('/complete', protect, completeLiveSession);

// HeyGen Real-Time Streaming Avatar API routes
router.post('/heygen-stream', protect, createHeyGenStreamSession);
router.post('/heygen-sdp', protect, sendHeyGenSdpAnswer);
router.post('/heygen-ice', protect, sendHeyGenIceCandidate);
router.post('/heygen-speak', protect, speakHeyGenTurn);
router.post('/heygen-stop', protect, stopHeyGenStreamSession);

export default router;
