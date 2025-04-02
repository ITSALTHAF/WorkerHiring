import express from 'express';
import { 
  getConversations, 
  getConversation, 
  createConversation,
  sendMessage,
  markAsRead,
  getUnreadCount
} from '../controllers/messaging.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getConversations)
  .post(protect, createConversation);

router.route('/:id')
  .get(protect, getConversation);

router.post('/:id/messages', protect, sendMessage);
router.put('/:id/read', protect, markAsRead);
router.get('/unread/count', protect, getUnreadCount);

export default router;
