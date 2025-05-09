import User from "../models/user.js";

export const getAllUsers = async (req, res) => {
	try {
		const users = await User.find({ _id: { $ne: req.user.id } }).select(
			"-password -otp -otpExpires"
		); // omit sensitive fields
		res.status(200).json(users);
	} catch (error) {
		console.error("Error fetching users:", error);
		res.status(500).json({ message: "Failed to fetch users" });
	}
};

// Delete a user by ID
export const deleteUser = async (req, res) => {
	try {
		const user = await User.findById(req.params.id);

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		await user.deleteOne();
		res.status(200).json({ message: "User deleted successfully" });
	} catch (error) {
		console.error("Error deleting user:", error);
		res.status(500).json({ message: "Failed to delete user" });
	}
};

// Verify a volunteer
export const verifyVolunteer = async (req, res) => {
	try {
		const user = await User.findById(req.params.id);

		if (!user || user.role !== "volunteer") {
			return res.status(404).json({ message: "Volunteer not found" });
		}

		if (user.isVerified) {
			return res
				.status(400)
				.json({ message: "Volunteer is already verified" });
		}

		user.isVerified = true;
		user.verifiedAt = new Date();
		await user.save();

		res.status(200).json({ message: "Volunteer verified successfully" });
	} catch (error) {
		console.error("Error verifying volunteer:", error);
		res.status(500).json({ message: "Failed to verify volunteer" });
	}
};
