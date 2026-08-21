import express from 'express';
import { getJobRecommendations, saveJob, getSavedJobs, deleteSavedJob } from '../controllers/jobController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/recommendations', getJobRecommendations);
router.post('/save', saveJob);
router.get('/saved', getSavedJobs);
router.delete('/save/:id', deleteSavedJob);

export default router;
