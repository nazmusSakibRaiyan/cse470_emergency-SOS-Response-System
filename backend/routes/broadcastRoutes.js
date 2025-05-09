import express from "express";
import { broadcastMessage, getAllBroadcasts } from "../controllers/broadcastController.js";
import { adminMiddleware } from "../middleware/authMiddleware.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Route to send a broadcast message (admin only)
router.post("/", authMiddleware, adminMiddleware, broadcastMessage);

// Route to fetch all past broadcasts (admin only)
router.get("/", authMiddleware, adminMiddleware, getAllBroadcasts);

export default router;

