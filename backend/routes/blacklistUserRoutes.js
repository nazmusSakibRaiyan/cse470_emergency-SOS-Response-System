import express from "express";
import {
  blacklistUser,
  getBlacklistedUsers,
  removeFromBlacklist, // <-- corrected
} from "../controllers/blacklistUserController.js";

const router = express.Router();

// Blacklist a user by ID
router.patch("/:id", blacklistUser);

// Get all blacklisted users
router.get("/", getBlacklistedUsers);

// Remove user from blacklist
router.patch("/remove/:id", removeFromBlacklist); // <-- corrected

export default router;
