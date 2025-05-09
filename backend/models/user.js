import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
	{
		name: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		phone: { type: String, required: true },
		role: { type: String, enum: ["volunteer", "user", "admin"], required: true },
		address: { type: String, required: true },
		nid: { type: String, required: true },
		otp: { type: String },
		otpExpires: { type: Date },
		blacklisted: { type: Boolean, default: false },
		isVerified: { type: Boolean, default: false },
		verifiedAt: { type: Date }, // New field to track verification timestamp
		isApproved: { type: Boolean, default: false }, // New field for admin approval
		volunteerStatus: {
			type: String,
			enum: ["active", "inactive"],
			default: "active",
		},
		isAdmin: { type: Boolean, default: false },
		socketId: { type: String, default: null }, // Added for real-time communication
	},
	{ timestamps: true }
);

const User = mongoose.model("User", UserSchema);
export default User;
