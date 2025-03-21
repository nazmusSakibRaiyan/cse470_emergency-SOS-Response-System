import express from "express";
import { sendOtp, enable2FA, verify2FA } from "../controllers/authController.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import authMiddleware from "../middleware/auth.js";
import nodemailer from "nodemailer";
import Otp from "../models/Otp.js";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import twilio from "twilio";


dotenv.config();
const router = express.Router();


// User Registration
router.post("/register", async (req, res) => {
    try {
      const { name, email, phone, nid, password,role, address, bloodGroup } = req.body;
  
      // Check if email or NID already exists
      const existingUser = await User.findOne({ $or: [{ email }, { nid }] });
      if (existingUser) return res.status(400).json({ message: "Email or NID already in use" });
  
      // Create new user
      const newUser = new User({ name, email, phone, nid, password });
      await newUser.save();
  
      // Generate JWT Token
      const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  
      res.status(201).json({ message: "User registered successfully", token });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  });

// User Login
// User Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email or password" });

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    // Generate JWT Token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// Protected Dashboard Route
router.get("/dashboard", authMiddleware, (req, res) => {
  res.status(200).json({ message: `Welcome, user ${req.user.id}! This is a protected route.` });
});

// Email Transporter Setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Twilio Client Setup
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);


// Generate OTP Function
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();


// Store OTP in Memory (for simplicity, use a DB in production)
//const otpStorage = {}; 

// Send OTP & Save to DB
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  const otp = generateOTP();

  otpStorage[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 }; // Expire in 5 minutes
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  try {
    // Remove existing OTP for the email
    await Otp.deleteOne({ email });

    // Save OTP to DB
    const newOtp = new Otp({ email, otp, expiresAt });
    await newOtp.save();

    // Send OTP to email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
    });


    // Send OTP via SMS
    if (phone) {
      await twilioClient.messages.create({
        body: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
    }

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
});



// Verify OTP
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const storedOtp = await Otp.findOne({ email });

    if (!storedOtp) return res.status(400).json({ message: "OTP expired or not requested" });

    if (new Date() > storedOtp.expiresAt) {
      await Otp.deleteOne({ email }); // Remove expired OTP
      return res.status(400).json({ message: "OTP expired" });
    }

    if (otp !== storedOtp.otp) return res.status(400).json({ message: "Invalid OTP" });

    await Otp.deleteOne({ email }); // Remove OTP after verification

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    res.status(500).json({ message: "OTP verification failed", error: error.message });
  }
  delete otpStorage[email]; // Remove OTP after verification
  res.status(200).json({ message: "OTP verified successfully" });
});

// Enable Google 2FA
router.post("/enable-2fa", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate a new secret key for Google Authenticator
    const secret = speakeasy.generateSecret({ length: 20 });

    user.googleAuthSecret = secret.base32;
    user.isTwoFactorEnabled = true;
    await user.save();

    // Generate QR code to scan with Google Authenticator
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.status(200).json({
      message: "2FA enabled successfully",
      qrCodeUrl,
      secret: secret.base32, // Save the secret in your user model
    });
  } catch (error) {
    res.status(500).json({ message: "Error enabling 2FA", error: error.message });
  }
});

// Verify Google Authenticator OTP
router.post("/verify-2fa", async (req, res) => {
  const { email, token } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isTwoFactorEnabled)
      return res.status(400).json({ message: "Two-Factor Authentication is not enabled" });

    // Verify the OTP using speakeasy
    const isVerified = speakeasy.totp.verify({
      secret: user.googleAuthSecret,
      encoding: "base32",
      token,
    });

    if (isVerified) {
      res.status(200).json({ message: "2FA verified successfully" });
    } else {
      res.status(400).json({ message: "Invalid 2FA token" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error verifying 2FA", error: error.message });
  }
});



// Enable Google 2FA
router.post("/enable-2fa", enable2FA);

// Verify Google 2FA OTP
router.post("/verify-2fa", verify2FA);

export default router;
