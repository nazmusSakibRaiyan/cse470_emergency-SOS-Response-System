import speakeasy from "speakeasy";
import qrcode from "qrcode";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import nodemailer from "nodemailer";
import twilio from "twilio";

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Twilio setup
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Send OTP via email & SMS
export const sendOtp = async (req, res) => {
  const { email, phone } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 mins

  try {
    // Remove old OTPs if any
    await Otp.deleteOne({ email });

    // Save the new OTP to DB
    const newOtp = new Otp({ email, otp, expiresAt });
    await newOtp.save();

    // Send OTP via email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
    });

    // Send OTP via SMS
    if (phone) {
      await twilioClient.messages.create({
        body: `Your OTP is ${otp}. It will expire in 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
    }

    res.status(200).json({ message: "OTP sent successfully via email & SMS" });
  } catch (error) {
    res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
};

// Enable Google Authenticator (2FA)
export const enable2FA = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate secret for Google Authenticator
    const secret = speakeasy.generateSecret({ length: 20 });
    user.googleAuthSecret = secret.base32;
    user.isTwoFactorEnabled = true;
    await user.save();

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.status(200).json({
      message: "2FA enabled successfully",
      qrCodeUrl,
      secret: secret.base32,
    });
  } catch (error) {
    res.status(500).json({ message: "Error enabling 2FA", error: error.message });
  }
};

// Verify OTP for Google Authenticator
export const verify2FA = async (req, res) => {
  const { email, token } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isTwoFactorEnabled)
      return res.status(400).json({ message: "Two-Factor Authentication not enabled" });

    // Verify OTP
    const isVerified = speakeasy.totp.verify({
      secret: user.googleAuthSecret,
      encoding: "base32",
      token,
    });

    if (isVerified) {
      res.status(200).json({ message: "OTP verified!" });
    } else {
      res.status(400).json({ message: "Invalid OTP" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error verifying 2FA", error: error.message });
  }
};
