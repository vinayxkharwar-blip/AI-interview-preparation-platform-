import express from 'express';
import { startSession, getUserSessions, getSessionById, completeSession } from '../controllers/sessionController.js';
import liveInterviewRoutes from './liveInterviewRoutes.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/start', startSession);
router.get('/', getUserSessions);
router.get('/:id', getSessionById);
router.post('/:id/complete', completeSession);

// Live Video Call Interview Mode Endpoints
router.use('/:id/live', liveInterviewRoutes);

export default router;

