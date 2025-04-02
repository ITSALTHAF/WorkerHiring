import express from 'express';
import { getProfile, createProfile, updateProfile, uploadProfilePhoto, verifyProfile } from '../controllers/profile.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getProfile)
  .post(protect, createProfile)
  .put(protect, updateProfile);

router.post('/upload-photo', protect, uploadProfilePhoto);
router.post('/verify', protect, verifyProfile);

export default router;
