import express from "express";
import { register, login, verifyOTP, getUser } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js"; 

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/verify-otp", verifyOTP);
router.get("/user", authMiddleware, getUser);

export default router;
