import express from 'express';
import {
  getCurrentDrive,
  startDrive,
  updateDriveRole,
  getDriveById,
  startAptitudeTest,
  submitAptitudeTest,
  startTechnicalRound,
  syncTechnicalRound,
  startGDRound,
  sendGDMessage,
  evaluateGDRound,
  startResumeRound,
  syncResumeRound,
  getFinalReport,
} from '../controllers/placementController.js';
import { protect } from '../middleware/authMiddleware.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Enforce strict authentication on all placement drive endpoints
router.use(protect);

// Core journey management
router.get('/current', getCurrentDrive);
router.post('/start', startDrive);
router.patch('/role', updateDriveRole);
router.get('/:id', getDriveById);
router.get('/:id/report', getFinalReport);

// Round 1: Aptitude Test
router.post('/:id/aptitude/start', startAptitudeTest);
router.post('/:id/aptitude/submit', submitAptitudeTest);

// Round 2: Technical Interview Integration
router.post('/:id/technical/start', aiLimiter, startTechnicalRound);
router.post('/:id/technical/sync', syncTechnicalRound);

// Round 3: Group Discussion Simulation
router.post('/:id/gd/start', startGDRound);
router.post('/:id/gd/message', sendGDMessage);
router.post('/:id/gd/evaluate', aiLimiter, evaluateGDRound);

// Round 4: Resume-Based Interview Integration
router.post('/:id/resume-round/start', aiLimiter, startResumeRound);
router.post('/:id/resume-round/sync', syncResumeRound);

export default router;
