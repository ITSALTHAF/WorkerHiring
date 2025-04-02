import express from 'express';
import { 
  createPayment, 
  getPayments, 
  getPayment, 
  updatePaymentStatus,
  getMyPayments,
  processPayment,
  releaseEscrow,
  requestRefund,
  processRefund
} from '../controllers/payment.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getPayments)
  .post(protect, createPayment);

router.get('/my-payments', protect, getMyPayments);

router.route('/:id')
  .get(protect, getPayment)
  .put(protect, updatePaymentStatus);

router.post('/:id/process', protect, processPayment);
router.post('/:id/release', protect, releaseEscrow);
router.post('/:id/refund-request', protect, requestRefund);
router.post('/:id/refund-process', protect, processRefund);

export default router;
