import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  getOrCreateChat,
  getUserChats,
  getChatMessages,
  sendMessage,
  markAsRead,
  createSOSChat,
  getChatById
} from '../controllers/chatController.js';

const router = express.Router();

// Protect all chat routes with authentication
router.use(authMiddleware);

// Chat routes
router.post('/create', getOrCreateChat);
router.post('/create-sos-chat', createSOSChat);
router.get('/user-chats', getUserChats);
router.get('/messages/:chatId', getChatMessages);
router.get('/direct/:chatId', getChatById); // New route to get a chat directly by ID
router.post('/send', sendMessage);
router.put('/read/:chatId', markAsRead);

export default router;