import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import sosRoutes from "./routes/sosRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import userRoute from "./routes/userRoute.js";
import { Server } from "socket.io";
import User from "./models/user.js";
import SOS from "./models/SOS.js";
import Chat from "./models/Chat.js";
import Notification from "./models/Notification.js";

import broadcastRoutes from "./routes/broadcastRoutes.js";
import userManagementRoutes from "./routes/userManagementRoutes.js";
import blacklistUserRoutes from "./routes/blacklistUserRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { sendPendingResponseReminders } from "./controllers/notificationController.js";

import feedbackRoutes from "./routes/feedbackRoutes.js";


dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

mongoose
	.connect(process.env.MONGO_URI)
	.then(() => console.log("Connected to MongoDB"))
	.catch((err) => console.error("Failed to connect to MongoDB", err));

app.use("/api/auth", authRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/user", userRoute);
app.use("/api/broadcast", broadcastRoutes);
app.use("/api/user-management", userManagementRoutes);
app.use("/api/blacklist-users", blacklistUserRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/feedback", feedbackRoutes);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () =>
	console.log(`Server running on port ${PORT}`)
);

const io = new Server(server, {
	cors: {
		origin: "*",
	},
});

io.on("connection", (socket) => {
	console.log("A user connected:", socket.id);

	// Store socket.id in User document when user authenticates
	socket.on("authenticate", async ({ userId }) => {
		try {
			if (!userId) return;
			
			const user = await User.findById(userId);
			if (user) {
				user.socketId = socket.id;
				await user.save();
				console.log(`User ${userId} authenticated with socket ${socket.id}`);
			}
		} catch (error) {
			console.error("Error storing socketId:", error);
		}
	});

	// Handle volunteer location updates for live tracking during SOS
	socket.on("volunteerLocationUpdate", async (data) => {
		try {
			const { sosId, volunteerId, coordinates } = data;
			
			// Verify the SOS exists and the volunteer is accepted
			const sos = await SOS.findById(sosId);
			if (!sos || !sos.acceptedBy.includes(volunteerId)) {
				return;
			}

			// Find the user who created the SOS
			const sosUser = await User.findById(sos.user);
			if (sosUser && sosUser.socketId) {
				// Get volunteer info for identification
				const volunteer = await User.findById(volunteerId);
				if (!volunteer) return;

				// Send location update directly to the user who created the SOS
				io.to(sosUser.socketId).emit("respondingVolunteerLocation", {
					sosId,
					volunteerId,
					volunteerName: volunteer.name,
					coordinates
				});
			}
		} catch (error) {
			console.error("Error handling volunteer location update:", error);
		}
	});
	
	// Handle chat message sending
	socket.on("sendMessage", async (data) => {
		try {
			const { chatId, message, senderId } = data;
			
			// Better logging for debugging
			console.log(`Message received for chat ${chatId} from sender ${senderId}`);
			
			if (!chatId || !senderId) {
				console.log("Missing required chat data:", { chatId, senderId });
				return;
			}
			
			const chat = await Chat.findById(chatId);
			if (!chat) {
				console.log(`Chat ${chatId} not found`);
				return;
			}
			
			// Convert ObjectIds to strings for comparison
			const participantIds = chat.participants.map(p => p.toString());
			const senderIdStr = senderId.toString();
			
			// Check if the sender is a participant in the chat
			if (!participantIds.includes(senderIdStr)) {
				console.log(`User ${senderId} not authorized to send messages to chat ${chatId}`);
				return;
			}
			
			// Log participants for debugging
			console.log(`Chat ${chatId} participants: ${participantIds}, sender: ${senderIdStr}`);
			
			// Notify all other participants in the chat
			for (const participantId of chat.participants) {
				const participantIdStr = participantId.toString();
				
				// Don't send notification to the sender
				if (participantIdStr !== senderIdStr) {
					const participant = await User.findById(participantId);
					
					if (participant && participant.socketId) {
						console.log(`Sending message to ${participant.name} (${participantIdStr}) with socket ${participant.socketId}`);
						
						io.to(participant.socketId).emit("receiveMessage", {
							chatId,
							message
						});
					} else {
						console.log(`Participant ${participantIdStr} not online or missing socketId`);
					}
				}
			}
		} catch (error) {
			console.error("Error handling message sending:", error);
		}
	});

	// Handle typing status in chat
	socket.on("typing", async (data) => {
		try {
			const { chatId, userId, isTyping } = data;
			
			// Validate all required data is present
			if (!chatId || !userId) {
				console.log("Missing required data for typing event:", data);
				return;
			}
			
			const chat = await Chat.findById(chatId);
			if (!chat) return;
			
			// Notify all other participants about typing status
			for (const participantId of chat.participants) {
				// Add null check and toString() safety
				if (participantId && userId && participantId.toString() !== userId.toString()) {
					const participant = await User.findById(participantId);
					
					if (participant && participant.socketId) {
						io.to(participant.socketId).emit("userTyping", {
							chatId,
							userId,
							isTyping
						});
					}
				}
			}
		} catch (error) {
			console.error("Error handling typing status:", error);
		}
	});
	
	// Handle read receipts for messages
	socket.on("messageRead", async (data) => {
		try {
			const { chatId, messageId, userId } = data;
			
			const chat = await Chat.findById(chatId);
			if (!chat) return;
			
			const message = chat.messages.id(messageId);
			if (!message) return;
			
			// Add user to the readBy array if not already there
			if (!message.readBy.some(read => read.user.toString() === userId)) {
				message.readBy.push({ user: userId, readAt: new Date() });
				await chat.save();
				
				// Get message sender
				const sender = await User.findById(message.sender);
				
				if (sender && sender.socketId) {
					// Notify sender that their message was read
					io.to(sender.socketId).emit("messageReadReceipt", {
						chatId,
						messageId,
						readBy: userId,
						readAt: new Date()
					});
				}
			}
		} catch (error) {
			console.error("Error handling message read status:", error);
		}
	});
	
	// Handle read receipts for SOS alerts
	socket.on("SOSRead", async (data) => {
		try {
			const { sosId, volunteerId } = data;
			
			// Mark SOS notification as read
			await Notification.findOneAndUpdate(
				{
					recipient: volunteerId,
					relatedId: sosId,
					type: 'SOS'
				},
				{
					isRead: true,
					readAt: new Date()
				}
			);
			
			// Get SOS details
			const sos = await SOS.findById(sosId);
			if (!sos) return;
			
			// Find user who created the SOS
			const sosCreator = await User.findById(sos.user);
			const volunteer = await User.findById(volunteerId);
			
			if (sosCreator && sosCreator.socketId && volunteer) {
				// Notify SOS creator that a volunteer has seen the alert
				io.to(sosCreator.socketId).emit("sosReadReceipt", {
					sosId,
					volunteer: {
						id: volunteerId,
						name: volunteer.name
					},
					readAt: new Date()
				});
			}
		} catch (error) {
			console.error("Error handling SOS read status:", error);
		}
	});

	socket.on("disconnect", async () => {
		console.log("A user disconnected:", socket.id);
		
		// Clear socketId from User document on disconnect
		try {
			await User.findOneAndUpdate(
				{ socketId: socket.id },
				{ $set: { socketId: null } }
			);
		} catch (error) {
			console.error("Error clearing socketId:", error);
		}
	});
});

// Schedule automated reminders for pending responses
setInterval(sendPendingResponseReminders, 5 * 60 * 1000); // Run every 5 minutes

export { io };
