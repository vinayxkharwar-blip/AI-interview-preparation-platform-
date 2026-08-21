import express from 'express';
import { createApplication, getUserApplications, updateApplicationStatus } from '../controllers/applicationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/', createApplication);
router.get('/', getUserApplications);
router.patch('/:id', updateApplicationStatus);

export default router;
