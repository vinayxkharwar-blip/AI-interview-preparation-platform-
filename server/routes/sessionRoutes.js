import express from 'express';
import { startSession, getUserSessions, getSessionById, completeSession } from '../controllers/sessionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/start', startSession);
router.get('/', getUserSessions);
router.get('/:id', getSessionById);
router.post('/:id/complete', completeSession);

export default router;
