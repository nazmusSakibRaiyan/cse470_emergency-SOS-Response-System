import Broadcast from "../models/Broadcast.js";
import User from "../models/user.js";
import { sendBroadcastEmail } from "../utils/sendEmail.js";

// Send a broadcast message
export const broadcastMessage = async (req, res) => {
    try {
        const { title, message } = req.body;

        if (!title || !message) {
            return res.status(400).json({ message: "Title and message are required" });
        }

        const broadcast = new Broadcast({ title, message });
        await broadcast.save();

        // Emit the broadcast message to all connected clients (if using WebSocket)
        if (req.io) {
            req.io.emit("broadcast", { title, message });
        }

        // Fetch all users' emails from the User model
        const users = await User.find({}, "email");
        const emailPromises = users.map((user) =>
            sendBroadcastEmail(user.email, `Emergency Broadcast: ${title}`, message)
        );

        // Send emails in parallel
        await Promise.all(emailPromises);

        res.status(201).json({ message: "Broadcast message sent successfully", broadcast });
    } catch (error) {
        res.status(500).json({ message: "Failed to send broadcast message", error: error.message });
    }
};

// Get all broadcast messages
export const getAllBroadcasts = async (req, res) => {
    try {
        const broadcasts = await Broadcast.find().sort({ createdAt: -1 });
        res.status(200).json(broadcasts);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch broadcast messages", error: error.message });
    }
};
