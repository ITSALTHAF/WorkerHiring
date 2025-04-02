import express from 'express';
import { 
  createJobPosting, 
  getJobPostings, 
  getJobPosting, 
  updateJobPosting, 
  deleteJobPosting,
  getMyJobPostings,
  applyToJob,
  getJobApplications,
  updateJobApplication
} from '../controllers/jobPosting.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(getJobPostings)
  .post(protect, createJobPosting);

router.get('/my-jobs', protect, getMyJobPostings);

router.route('/:id')
  .get(getJobPosting)
  .put(protect, updateJobPosting)
  .delete(protect, deleteJobPosting);

router.post('/:id/apply', protect, authorize('worker'), applyToJob);
router.get('/:id/applications', protect, getJobApplications);
router.put('/applications/:applicationId', protect, updateJobApplication);

export default router;
