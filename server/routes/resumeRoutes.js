import express from 'express';
import { uploadResume, getUserResumes, getResumeById } from '../controllers/resumeController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/upload', upload.single('resume'), uploadResume);
router.get('/', getUserResumes);
router.get('/:id', getResumeById);

export default router;
