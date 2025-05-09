import express from "express";
import {
	getAllUsers,
	deleteUser,
	verifyVolunteer,
	getPendingUsers,
	getUnverifiedVolunteers, // Add the new controller function
	approveOrRejectUser
} from "../controllers/userManagementController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { approveUser, rejectUser } from "../controllers/approveUser.js";
import { adminMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all users (protected)
router.get("/", authMiddleware, getAllUsers);

// Delete user by ID (protected)
router.delete("/:id", authMiddleware, deleteUser);

// Verify a volunteer by ID (protected)
router.patch("/verify/:id", authMiddleware, adminMiddleware, verifyVolunteer);

// Get users pending approval (admin only)
router.get("/pending", authMiddleware, adminMiddleware, getPendingUsers);

// Get unverified volunteers (admin only)
router.get("/volunteers/unverified", authMiddleware, adminMiddleware, getUnverifiedVolunteers);

// Approve a user by ID (admin only)
router.patch("/approve/:id", authMiddleware, adminMiddleware, approveUser);

// Reject a user by ID (admin only)
router.delete("/reject/:id", authMiddleware, adminMiddleware, rejectUser);

// Approve or reject a user (admin only)
router.post("/approval-action", authMiddleware, adminMiddleware, approveOrRejectUser);

export default router;
