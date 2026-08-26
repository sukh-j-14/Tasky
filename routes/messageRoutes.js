const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middlewars/auth.middleware');

// Apply authentication to all routes
router.use(authMiddleware.authenticateUser);

// Create or get conversation
router.post('/conversations', messageController.createOrGetConversation);

// Get user's conversations
router.get('/conversations', messageController.getConversations);

// Get conversation messages
router.get('/conversations/:conversationId/messages', messageController.getMessages);

// Send message
router.post('/conversations/:conversationId/messages', messageController.sendMessage);

// Edit message
router.put('/messages/:messageId', messageController.editMessage);

// Delete message
router.delete('/messages/:messageId', messageController.deleteMessage);

// Mark messages as read
router.post('/conversations/:conversationId/read', messageController.markAsRead);

// Get unread message count
router.get('/unread-count', messageController.getUnreadCount);

// Archive conversation
router.post('/conversations/:conversationId/archive', messageController.archiveConversation);

// Delete conversation
router.delete('/conversations/:conversationId', messageController.deleteConversation);

// Search messages
router.get('/search', messageController.searchMessages);

// Send update request
router.post('/send-update-request', messageController.sendUpdateRequest);

module.exports = router;
