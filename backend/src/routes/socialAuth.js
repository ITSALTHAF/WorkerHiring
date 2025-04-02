import express from 'express';
import { googleAuth, appleAuth, facebookAuth, generateMFA, verifyAndEnableMFA, verifyMFALogin, disableMFA } from '../controllers/socialAuth.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Social authentication routes
router.post('/google', googleAuth);
router.post('/apple', appleAuth);
router.post('/facebook', facebookAuth);

// MFA routes
router.post('/mfa/generate', protect, generateMFA);
router.post('/mfa/verify', protect, verifyAndEnableMFA);
router.post('/mfa/login', verifyMFALogin);
router.post('/mfa/disable', protect, disableMFA);

export default router;
