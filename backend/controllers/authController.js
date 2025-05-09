import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Nodemailer Setup
const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS,
	},
	tls: {
		rejectUnauthorized: false,
	},
});

// Generate OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Register User
export const register = async (req, res) => {
  try {
    const { name, email, password, phone, role, address, nid } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user with proper verification settings
    const newUser = new User({ 
      name, 
      email, 
      password: hashedPassword, 
      phone, 
      role, 
      address, 
      nid,
      // If the role is volunteer, set isVerified to false and isApproved to false
      isVerified: role !== "volunteer",
      isApproved: role !== "volunteer"
    });
    await newUser.save();

    // Send Welcome Email with appropriate message
    const emailSubject = "Welcome to SOS";
    let emailText = `Hi ${name},\n\nThank you for registering on SOS! We're excited to have you on board.`;
    
    if (role === "volunteer") {
      emailText += `\n\nYour volunteer application is under review. An admin will verify your account shortly.`;
    }
    
    emailText += `\n\nBest Regards,\nSOS Team`;
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: emailSubject,
      text: emailText,
    });

    res.status(201).json({ 
      message: role === "volunteer" 
        ? "Registration successful. Your volunteer account is pending admin verification." 
        : "User registered successfully. Please login." 
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// Login 
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Check if volunteer is verified and approved
    if (user.role === "volunteer" && (!user.isVerified || !user.isApproved)) {
      return res.status(403).json({ 
        message: "Your volunteer account is pending admin verification. You will be notified once your account is approved." 
      });
    }

    // Generate OTP
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
    await user.save();

    // Send OTP via Email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is: ${otp}. This OTP is valid for 5 minutes.`,
    });

    res.status(200).json({ message: "OTP sent to email. Please verify OTP to login." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Verify OTP & Generate JWT Token (Step 2)
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Check OTP
    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Generate JWT Token
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    console.log("Generated Token:", token); 

    // Clear OTP
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // Send back the token and user details (excluding sensitive info)
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address,
        nid: user.nid,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};


// Get User Info (Protected Route)
export const getUser = async (req, res) => {
  try {
    // req.user is set by authMiddleware after decoding the token
    const user = await User.findById(req.user.userId).select("-password"); 

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }


    res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// Update User Profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId; // Assuming authMiddleware adds userId to req.user
    const { name, email, phone, address, nid } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields if they are provided in the request body
    if (name) user.name = name;
    if (email) {
      // Check if the new email is already taken by another user
      if (email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ message: "Email already in use by another account" });
        }
      }
      user.email = email;
    }
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (nid) user.nid = nid;

    await user.save();

    // Return updated user information (excluding sensitive data)
    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address,
        nid: user.nid,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error while updating profile", error: error.message });
  }
};

// Delete User Account
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "Your account has been deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

