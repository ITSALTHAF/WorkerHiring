import express from 'express';
import { 
  searchWorkers, 
  searchJobs, 
  getPopularCategories,
  getRecommendedWorkers,
  getRecommendedJobs
} from '../controllers/search.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/workers', searchWorkers);
router.get('/jobs', searchJobs);
router.get('/categories/popular', getPopularCategories);
router.get('/workers/recommended', protect, getRecommendedWorkers);
router.get('/jobs/recommended', protect, getRecommendedJobs);

export default router;
