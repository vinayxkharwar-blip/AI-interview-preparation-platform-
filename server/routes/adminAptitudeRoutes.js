import express from 'express';
import {
  importAptitudeQuestions,
  getAdminAptitudeQuestions,
  updateQuestion,
  verifyQuestion,
  deleteQuestion,
} from '../controllers/adminAptitudeController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Enforce authentication AND admin privileges
router.use(protect);
router.use(requireAdmin);

router.post('/import', importAptitudeQuestions);
router.get('/questions', getAdminAptitudeQuestions);
router.patch('/questions/:id', updateQuestion);
router.post('/questions/:id/verify', verifyQuestion);
router.delete('/questions/:id', deleteQuestion);

export default router;
