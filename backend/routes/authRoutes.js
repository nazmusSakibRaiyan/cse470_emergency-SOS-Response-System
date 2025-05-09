import express from "express";
import { register, login, verifyOTP, getUser, deleteAccount } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js"; 

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/verify-otp", verifyOTP);
router.get("/user", authMiddleware, getUser);
//router.put("/update-profile", authMiddleware, updateProfile);
router.delete("/delete-account", authMiddleware, deleteAccount);


export default router;
