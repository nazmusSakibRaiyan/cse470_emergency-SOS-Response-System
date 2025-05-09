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
