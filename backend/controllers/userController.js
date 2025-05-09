import User from "../models/user.js";
import Contact from "../models/Contact.js";

export const getAllUserExceptMe = async (req, res) => {
	try {
		const { myId } = req.body;
		const myUser = await User.findById(myId);
		if (!myUser) return res.status(404).json({ message: "User not found" });
		const allUsers = await User.find({ _id: { $ne: myId } }).select(
			"-password"
		);
		let filteredUsers = allUsers;

		const myContacts = await Contact.findOne({ user: myId });
		if (myContacts) {
			const contacts = await User.find({
				_id: { $in: myContacts.contacts },
			}).select("-password");

			filteredUsers = allUsers.filter(
				(user) =>
					!contacts.some((contact) => contact.email === user.email)
			);
		}
		res.status(200).json(filteredUsers);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error", error });
	}
};

export const updateVolunteerStatus = async (req, res) => {
	try {
		const { userId, status } = req.body;

		if (!["active", "inactive"].includes(status)) {
			return res.status(400).json({ message: "Invalid status value" });
		}

		const user = await User.findById(userId);
		if (!user || user.role !== "volunteer") {
			return res.status(404).json({ message: "Volunteer not found" });
		}

		user.volunteerStatus = status;
		await user.save();

		res.status(200).json({
			message: "Volunteer status updated successfully",
		});
	} catch (error) {
		console.error("Error updating volunteer status:", error);
		res.status(500).json({ message: "Failed to update volunteer status" });
	}
};
