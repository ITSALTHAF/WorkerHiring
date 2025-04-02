import express from 'express';
import { 
  createBooking, 
  getBookings, 
  getBooking, 
  updateBooking, 
  cancelBooking,
  getMyBookings,
  completeBooking,
  rateBooking
} from '../controllers/booking.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getBookings)
  .post(protect, createBooking);

router.get('/my-bookings', protect, getMyBookings);

router.route('/:id')
  .get(protect, getBooking)
  .put(protect, updateBooking);

router.post('/:id/cancel', protect, cancelBooking);
router.post('/:id/complete', protect, completeBooking);
router.post('/:id/rate', protect, rateBooking);

export default router;
