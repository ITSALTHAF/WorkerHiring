import express from 'express';
import { getWorkerProfile, createWorkerProfile, updateWorkerProfile, uploadPortfolio, addCertification, updateAvailability } from '../controllers/worker.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getWorkerProfile)
  .post(protect, createWorkerProfile)
  .put(protect, authorize('worker'), updateWorkerProfile);

router.post('/portfolio', protect, authorize('worker'), uploadPortfolio);
router.post('/certification', protect, authorize('worker'), addCertification);
router.put('/availability', protect, authorize('worker'), updateAvailability);

export default router;
