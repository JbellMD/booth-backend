import { Router } from 'express';
import { MessageController } from './message.controller';
import { requireAuth, populateUser, requireRole } from '../../middleware/auth';

const router = Router();
const messageController = new MessageController();

// All message routes require authentication
router.use(requireAuth);
router.use(populateUser);

// Send a new message
router.post('/', (req, res) => messageController.sendMessage(req, res));

// Get a specific message by ID
router.get('/:id', (req, res) => messageController.getMessageById(req, res));

// Delete a message
router.delete('/:id', (req, res) => messageController.deleteMessage(req, res));

// Get all conversations for the current user
router.get('/conversations', (req, res) => messageController.getUserConversations(req, res));

// Get unread message count
router.get('/unread/count', (req, res) => messageController.getUnreadCount(req, res));

// Get conversation with a specific user
router.get('/conversations/:userId', (req, res) => messageController.getConversation(req, res));

// Mark conversation as read
router.post('/conversations/:userId/read', (req, res) => messageController.markConversationAsRead(req, res));

export default router;
