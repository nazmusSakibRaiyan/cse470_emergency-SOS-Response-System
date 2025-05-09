// // controllers/broadcastController.js
// import Broadcast from "../models/Broadcast.js";
// import { sendBroadcastEmail } from "../utils/sendEmail.js";

// /**
//  * Handle creating and broadcasting a new emergency message
//  */
// export const broadcastMessage = async (req, res) => {
//   const { title, message } = req.body;

//   if (!title || !message) {
//     return res.status(400).json({ error: "Title and message are required." });
//   }

//   try {
//     // Save broadcast to database
//     const broadcast = new Broadcast({ title, message });
//     await broadcast.save();

//     // TODO: Replace with actual contact list loop
//     const recipientEmail = "mohammod.tasneem.hasan@g.bracu.ac.bd";
//     const subject = `Emergency Broadcast: ${title}`;

//     // Send email
//     await sendBroadcastEmail(recipientEmail, subject, message);

//     res.status(201).json({
//       message: "Broadcast sent and email delivered.",
//       broadcast,
//     });
//   } catch (error) {
//     console.error("Broadcast Error:", error);
//     res.status(500).json({ error: "Failed to send broadcast" });
//   }
// };

// /**
//  * Fetch all past broadcasts
//  */
// export const getAllBroadcasts = async (_req, res) => {
//   try {
//     const broadcasts = await Broadcast.find().sort({ createdAt: -1 });
//     res.status(200).json(broadcasts);
//   } catch (error) {
//     console.error("Fetch Broadcasts Error:", error);
//     res.status(500).json({ error: "Failed to fetch broadcasts" });
//   }
// };

// controllers/broadcastController.js
import Broadcast from "../models/Broadcast.js";
import User from "../models/user.js";
import { sendBroadcastEmail } from "../utils/sendEmail.js";

// Handle creating and broadcasting a new emergency message
export const broadcastMessage = async (req, res) => {
  const { title, message } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: "Title and message are required." });
  }

  try {
    // Save broadcast to database
    const broadcast = new Broadcast({ title, message });
    await broadcast.save();

    // Fetch all users' emails from the User model
    const users = await User.find({}, "email");
    const emailPromises = users.map((user) =>
      sendBroadcastEmail(user.email, `Emergency Broadcast: ${title}`, message)
    );

    // Send emails in parallel
    await Promise.all(emailPromises);

    res.status(201).json({
      message: "Broadcast sent and emails delivered.",
      broadcast,
    });
  } catch (error) {
    console.error("Broadcast Error:", error);
    res.status(500).json({ error: "Failed to send broadcast" });
  }
};

// Fetch all past broadcasts
export const getAllBroadcasts = async (_req, res) => {
  try {
    const broadcasts = await Broadcast.find().sort({ createdAt: -1 });
    res.status(200).json(broadcasts);
  } catch (error) {
    console.error("Fetch Broadcasts Error:", error);
    res.status(500).json({ error: "Failed to fetch broadcasts" });
  }
};
