import mongoose from "mongoose";
import User from "./user.js";

const ContactSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		contacts: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			},
		],
	},
	{ timestamps: true }
);

const Contact = mongoose.model("Contact", ContactSchema);
export default Contact;
