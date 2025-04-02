import express from 'express';
import { 
  getDashboardStats, 
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  suspendUser,
  getJobs,
  getJob,
  updateJob,
  deleteJob,
  getBookings,
  getBooking,
  updateBooking,
  getPayments,
  getPayment,
  updatePayment,
  getReports,
  getReport,
  updateReport,
  getSystemLogs
} from '../controllers/admin.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Apply admin authorization to all routes
router.use(protect, authorize('admin'));

// Dashboard
router.get('/dashboard', getDashboardStats);

// Users
router.get('/users', getUsers);
router.route('/users/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);
router.put('/users/:id/suspend', suspendUser);

// Jobs
router.get('/jobs', getJobs);
router.route('/jobs/:id')
  .get(getJob)
  .put(updateJob)
  .delete(deleteJob);

// Bookings
router.get('/bookings', getBookings);
router.route('/bookings/:id')
  .get(getBooking)
  .put(updateBooking);

// Payments
router.get('/payments', getPayments);
router.route('/payments/:id')
  .get(getPayment)
  .put(updatePayment);

// Reports
router.get('/reports', getReports);
router.route('/reports/:id')
  .get(getReport)
  .put(updateReport);

// System logs
router.get('/logs', getSystemLogs);

export default router;
