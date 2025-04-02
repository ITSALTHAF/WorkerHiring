import express from 'express';
import { switchRole, getUserRole } from '../controllers/role.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getUserRole);
router.post('/switch', protect, switchRole);

export default router;
