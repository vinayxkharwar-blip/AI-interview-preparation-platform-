import express from 'express';
import { transcribeAnswerAudio, submitAnswer } from '../controllers/answerController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/transcribe', upload.single('audio'), transcribeAnswerAudio);
router.post('/submit', upload.single('audio'), submitAnswer);

export default router;
