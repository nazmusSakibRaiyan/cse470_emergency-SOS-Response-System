import Chat from '../models/Chat.js';
import User from '../models/user.js';
import Notification from '../models/Notification.js';
import { io } from '../server.js';

// Create a new chat or get existing chat between users
export const getOrCreateChat = async (req, res) => {
  try {
    const { participantIds } = req.body;
    const currentUserId = req.user.userId || req.user.id;
    const allParticipants = [...participantIds, currentUserId];
    
    // Find existing chat with these exact participants
    let chat = await Chat.findOne({
      participants: { $size: allParticipants.length, $all: allParticipants }
    }).populate('participants', 'name email profilePicture');

    if (!chat) {
      // Create new chat if none exists
      chat = new Chat({
        participants: allParticipants,
        messages: []
      });
      await chat.save();
    }

    res.status(200).json(chat);
  } catch (error) {
    console.error('Error in getOrCreateChat:', error);
    res.status(500).json({ message: 'Failed to retrieve or create chat' });
  }
};

// Get all chats for a user
export const getUserChats = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const chats = await Chat.find({ participants: userId })
      .populate('participants', 'name email profilePicture')
      .populate({
        path: 'lastMessage.sender',
        select: 'name'
      })
      .sort({ updatedAt: -1 });
    
    res.status(200).json(chats);
  } catch (error) {
    console.error('Error in getUserChats:', error);
    res.status(500).json({ message: 'Failed to retrieve chats' });
  }
};

// Get messages from a specific chat
export const getChatMessages = async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const userId = req.user.userId || req.user.id;
    
    // Find chat and check if user is participant
    const chat = await Chat.findById(chatId)
      .populate({
        path: 'messages.sender',
        select: 'name email profilePicture'
      });
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ message: 'Not authorized to access this chat' });
    }

    // Mark messages as read by this user
    for (const message of chat.messages) {
      if (!message.readBy.some(read => read.user.toString() === userId)) {
        message.readBy.push({ user: userId, readAt: new Date() });
      }
    }
    await chat.save();
    
    res.status(200).json(chat.messages);
  } catch (error) {
    console.error('Error in getChatMessages:', error);
    res.status(500).json({ message: 'Failed to retrieve messages' });
  }
};

// Send a new message
export const sendMessage = async (req, res) => {
  try {
    const { chatId, content, attachments = [] } = req.body;
    
    // Extract user ID correctly from the JWT token payload
    // The token payload likely has userId instead of id
    const senderId = req.user.userId || req.user.id;
    
    console.log('User data from token:', req.user);
    console.log('Extracted senderId:', senderId);
    
    // Validate essential parameters
    if (!chatId || !content || !senderId) {
      console.warn('Missing required fields for sending message:', { chatId, content, senderId });
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    if (!chat.participants.includes(senderId)) {
      console.warn('User not authorized to send message:', { senderId, participants: chat.participants });
      return res.status(403).json({ message: 'Not authorized to send messages to this chat' });
    }
    
    // Ensure sender exists before creating message
    const senderExists = await User.findById(senderId);
    if (!senderExists) {
      return res.status(404).json({ message: 'Sender not found' });
    }
    
    const newMessage = {
      sender: senderId,
      content,
      timestamp: new Date(),
      readBy: [{ user: senderId }],
      attachments: attachments || []
    };
    
    // Add the message to the chat
    chat.messages.push(newMessage);
    chat.lastMessage = {
      content,
      sender: senderId,
      timestamp: new Date()
    };
    
    try {
      await chat.save();
    } catch (saveError) {
      console.warn('Error in chat.save():', saveError);
      return res.status(500).json({ message: 'Failed to save message', error: saveError.message });
    }
    
    // Populate sender info for the response
    const populatedChat = await Chat.findById(chatId)
      .populate({
        path: 'messages.sender',
        select: 'name email profilePicture'
      })
      .populate({
        path: 'participants',
        select: 'name email profilePicture socketId'
      });
    
    const sentMessage = populatedChat.messages[populatedChat.messages.length - 1];
    
    // Notify other participants through Socket.IO
    const otherParticipants = chat.participants.filter(
      participant => participant && participant.toString() !== senderId
    );

    // Create notifications and send real-time updates
    for (const participantId of otherParticipants) {
      const participant = await User.findById(participantId);
      if (participant) {
        // Create notification for this user
        const notification = new Notification({
          recipient: participantId,
          type: 'CHAT',
          title: 'New Message',
          message: `${senderExists.name} sent you a message`,
          relatedId: chatId,
          onModel: 'Chat',
          metadata: {
            senderId: senderId,
            senderName: senderExists.name,
            messagePreview: content.substring(0, 50) + (content.length > 50 ? '...' : '')
          }
        });
        await notification.save();
        
        // Send real-time notification via socket if user is online
        if (participant.socketId) {
          io.to(participant.socketId).emit('newMessage', {
            chatId,
            message: sentMessage,
            notification: notification
          });
        }
      }
    }
    
    res.status(201).json(sentMessage);
  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

// Mark messages as read
export const markAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.userId || req.user.id;
    
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    let updated = false;
    
    // Mark messages as read
    for (const message of chat.messages) {
      if (!message.readBy.some(read => read.user.toString() === userId)) {
        message.readBy.push({ user: userId, readAt: new Date() });
        updated = true;
      }
    }
    
    if (updated) {
      await chat.save();
    }
    
    // Mark associated notifications as read
    await Notification.updateMany(
      {
        recipient: userId,
        type: 'CHAT',
        relatedId: chatId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );
    
    res.status(200).json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error in markAsRead:', error);
    res.status(500).json({ message: 'Failed to mark messages as read' });
  }
};

// Create a SOS-related chat
export const createSOSChat = async (req, res) => {
  try {
    const { sosId, userIds } = req.body;
    const currentUserId = req.user.userId || req.user.id;
    
    console.log('Creating SOS chat with:', { sosId, userIds, currentUserId });
    
    // Include the current user in participants if not already included
    let participants = [...userIds];
    if (!participants.includes(currentUserId)) {
      participants.push(currentUserId);
    }
    
    let chat = new Chat({
      participants,
      relatedSOS: sosId,
      messages: []
    });
    
    await chat.save();
    
    // Populate the chat with user information
    chat = await Chat.findById(chat._id)
      .populate('participants', 'name email profilePicture')
      .populate('relatedSOS');
    
    res.status(201).json(chat);
  } catch (error) {
    console.error('Error in createSOSChat:', error);
    res.status(500).json({ message: 'Failed to create SOS chat room' });
  }
};

// Get chat details by ID
export const getChatById = async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const userId = req.user.userId || req.user.id;
    
    // Find chat and check if user is participant
    const chat = await Chat.findById(chatId)
      .populate('participants', 'name email profilePicture')
      .populate('relatedSOS');
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Security check - only participants can access the chat
    if (!chat.participants.some(p => p._id.toString() === userId)) {
      return res.status(403).json({ message: 'Not authorized to access this chat' });
    }
    
    res.status(200).json(chat);
  } catch (error) {
    console.error('Error in getChatById:', error);
    res.status(500).json({ message: 'Failed to retrieve chat details' });
  }
};