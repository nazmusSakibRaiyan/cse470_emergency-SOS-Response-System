import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
	{
		name: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		phone: { type: String, required: true },
		role: { type: String, enum: ["volunteer", "user"], required: true },
		address: { type: String, required: true },
		nid: { type: String, required: true },
		otp: { type: String },
		otpExpires: { type: Date },
		blacklisted: { type: Boolean, default: false },
		isVerified: { type: Boolean, default: false },
		verifiedAt: { type: Date }, // New field to track verification timestamp
		volunteerStatus: {
			type: String,
			enum: ["active", "inactive"],
			default: "active",
		},
	},
	{ timestamps: true }
);

const User = mongoose.model("User", UserSchema);
export default User;
