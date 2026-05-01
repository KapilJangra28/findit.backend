const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getConversation,
  getConversations,
  getUnreadCount,
  markAsRead
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.post('/', sendMessage);
router.get('/conversations', getConversations);
router.get('/conversation/:userId', getConversation);
router.get('/unread', getUnreadCount);
router.put('/:id/read', markAsRead);

module.exports = router;
