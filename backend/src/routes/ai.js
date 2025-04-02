import express from 'express';
import { 
  getDynamicPrice, 
  getMatchedWorkers,
  detectFraud,
  detectFakeReview,
  getChatbotResponse
} from '../controllers/ai.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/dynamic-pricing', protect, getDynamicPrice);
router.get('/matched-workers/:jobId', protect, getMatchedWorkers);
router.post('/fraud-detection', protect, detectFraud);
router.post('/review-detection', protect, detectFakeReview);
router.post('/chatbot', getChatbotResponse);

export default router;
