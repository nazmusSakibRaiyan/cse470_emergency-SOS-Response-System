import User from "../models/user.js";
import Contact from "../models/Contact.js";

export const addNewContact = async (req, res) => {
	const { myId, friendId } = req.body;
	try {
		const myUser = await User.findById(myId);
		if (!myUser) return res.status(404).json({ message: "User not found" });
		const friendUser = await User.findById(friendId);
		if (!friendUser)
			return res.status(404).json({ message: "Friend not found" });
		const myContact = await Contact.findOne({ user: myId });
		if (!myContact) {
			const newContact = new Contact({
				user: myId,
				contacts: [friendId],
			});
			await newContact.save();
		} else {
			myContact.contacts.push(friendId);
			await myContact.save();
		}
		res.status(200).json({ message: "Contact added successfully" });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error", error });
	}
};

export const getAllContacts = async (req, res) => {
	const { myId } = req.body;
	try {
		const myUser = await User.findById(myId);
		if (!myUser) return res.status(404).json({ message: "User not found" });
		const myContacts = await Contact.findOne({ user: myId });
		if (!myContacts) return res.status(200).json([]);
		const contacts = await User.find({
			_id: { $in: myContacts.contacts },
		}).select(
			"-password"
		);

		if (!contacts)
			return res.status(404).json({ message: "No contacts found" });

		res.status(200).json(contacts);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error", error });
	}
};

export const deleteContact = async (req, res) => {
	const { myId, friendId } = req.body;
	try {
		const contact = await Contact.findOne({ user: myId });
		if (!contact)
			return res.status(404).json({ message: "Contact not found" });
		const friendIndex = contact.contacts.indexOf(friendId);
		if (friendIndex === -1)
			return res
				.status(404)
				.json({ message: "Friend not found in contacts" });
		contact.contacts.splice(friendIndex, 1);
		await contact.save();
		res.status(200).json({ message: "Contact deleted successfully" });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error", error });
	}
};
