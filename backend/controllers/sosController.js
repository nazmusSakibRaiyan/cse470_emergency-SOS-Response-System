import bcrypt from "bcrypt";
import User from "../models/user.js";
import SOS from "../models/SOS.js";
import Contact from "../models/Contact.js";
import { io } from "../server.js";
import { createSOSNotification } from "./notificationController.js";
import {
	sendEmail,
	sendSOSEmergencyAlert,
	sendSMS,
} from "../utils/sendEmail.js";
import Notification from "../models/Notification.js";
import Chat from "../models/Chat.js";

// Send Silent SOS - no sound but urgent
export const sendSilentSOS = async (req, res) => {
	try {
		const { userId, message, coordinates } = req.body;

		const user = await User.findById(userId).select("-password -__v");
		if (!user) return res.status(404).json({ message: "User not found" });

		const sos = new SOS({
			user: user._id,
			message,
			coordinates,
		});
		const newSOS = await sos.save();

		// Find all active and verified volunteers
		const activeVerifiedVolunteers = await User.find({
			role: "volunteer",
			volunteerStatus: "active",
			isVerified: true,
		});

		// Create notifications and send alerts to volunteers using our notification system
		const volunteerIds = activeVerifiedVolunteers.map(
			(volunteer) => volunteer._id
		);
		await createSOSNotification(newSOS._id, userId, volunteerIds);

		// Emit to all connected clients
		io.emit("newSOS", {
			message: message,
			user: user,
			location: coordinates,
			_id: newSOS._id,
			coordinates: coordinates,
			acceptedBy: [],
			timestamp: new Date(),
		});

		res.status(200).json({ message: "SOS sent successfully" });
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: "Server error", error });
	}
};

export const sendSoftSOS = async (req, res) => {
	try {
		const { userId, message, coordinates, receiver } = req.body;

		const user = await User.findById(userId).select("-password -__v");
		if (!user) return res.status(404).json({ message: "User not found" });

		const sos = new SOS({
			user: user._id,
			message,
			coordinates,
			isContact: receiver === "contact",
		});
		const newSOS = await sos.save();

		if (receiver === "volunteer") {
			// Find active and verified volunteers
			const activeVerifiedVolunteers = await User.find({
				role: "volunteer",
				volunteerStatus: "active",
				isVerified: true,
			});

			// Create notifications for volunteers
			const volunteerIds = activeVerifiedVolunteers.map(
				(volunteer) => volunteer._id
			);
			await createSOSNotification(newSOS._id, userId, volunteerIds);

			// Emit to all connected clients
			io.emit("newSOS", {
				message: message,
				user: user,
				location: coordinates,
				_id: newSOS._id,
				coordinates: coordinates,
				acceptedBy: [],
				timestamp: new Date(),
			});
		} else if (receiver === "contact") {
			const myContacts = await Contact.findOne({ user: userId });
			if (!myContacts)
				return res.status(404).json({ message: "No contacts found" });

			// Send emergency alerts to contacts via email
			for (const contact of myContacts.contacts) {
				try {
					// Send HTML-formatted email to emergency contacts
					await sendSOSEmergencyAlert(
						contact.user_email,
						user.name,
						message,
						coordinates,
						new Date()
					);

					// Try to send SMS if phone number is available
					if (contact.user_phone) {
						const smsMessage = `SOS ALERT: ${user.name} needs urgent help! Location: https://maps.google.com/?q=${coordinates.latitude},${coordinates.longitude}`;
						await sendSMS(contact.user_phone, smsMessage);
					}
				} catch (error) {
					console.error("Error sending emergency alert:", error);
				}
			}
		}

		res.status(200).json({ message: "SOS sent successfully" });
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: "Server error", error });
	}
};

export const setAsResolved = async (req, res) => {
	const { sosId } = req.body;
	try {
		const sos = await SOS.findById(sosId);
		if (!sos) return res.status(404).json({ message: "SOS not found" });

		// Store acceptedBy array before resolving (for notifications)
		const acceptedVolunteers = [...sos.acceptedBy];

		sos.isResolved = true;
		await sos.save();

		// Create resolved notifications for volunteers who accepted this SOS
		if (acceptedVolunteers.length > 0) {
			// Find all volunteers with their socketIds
			const volunteers = await User.find({
				_id: { $in: acceptedVolunteers },
			});

			// Create resolution notification for each volunteer
			for (const volunteer of volunteers) {
				// Create notification record
				const notification = new Notification({
					recipient: volunteer._id,
					type: "SOS",
					title: "SOS Resolved",
					message:
						"An SOS case you were helping with has been marked as resolved.",
					relatedId: sosId,
					onModel: "SOS",
				});
				await notification.save();

				// Send real-time notification if volunteer is online
				if (volunteer.socketId) {
					io.to(volunteer.socketId).emit("sosResolved", {
						sosId,
						message:
							"This SOS has been marked as resolved by the user.",
						notification,
					});
				}
			}
		}

		res.status(200).json({ message: "SOS marked as resolved" });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error", error });
	}
};

// Get a specific SOS by ID with read receipt information
export const getSOSById = async (req, res) => {
	try {
		const { sosId } = req.params;
		const userId = req.user.id;

		// Find and populate the SOS
		const sos = await SOS.findById(sosId)
			.populate("user", "-password")
			.populate("acceptedBy", "name email profilePicture");

		if (!sos) {
			return res.status(404).json({ message: "SOS not found" });
		}

		// Find related notifications to get read status
		const notifications = await Notification.find({
			relatedId: sosId,
			type: "SOS",
		}).populate("recipient", "name");

		// Format read receipts for frontend with null check
		const readReceipts = notifications
			.filter((n) => n.isRead && n.recipient)
			.map((n) => ({
				volunteerId: n.recipient._id,
				volunteerName: n.recipient?.name || "Unknown Volunteer",
				readAt: n.readAt,
			}));

		// If this is a volunteer viewing the SOS, mark their notification as read
		if (req.user.role === "volunteer") {
			// Update notification read status
			await Notification.findOneAndUpdate(
				{
					recipient: userId,
					relatedId: sosId,
					type: "SOS",
					isRead: false,
				},
				{ isRead: true, readAt: new Date() }
			);

			// Emit read receipt event to the SOS creator
			if (sos.user && sos.user.socketId) {
				const volunteer = await User.findById(userId, "name");
				if (volunteer) {
					io.to(sos.user.socketId).emit("sosReadReceipt", {
						sosId,
						volunteer: {
							id: userId,
							name: volunteer.name || "Unknown Volunteer",
						},
						readAt: new Date(),
					});
				}
			}
		}

		res.status(200).json({
			sos,
			readReceipts,
		});
	} catch (error) {
		console.error("Error getting SOS by ID:", error);
		res.status(500).json({ message: "Server error", error });
	}
};

export const getAllNonResolvedSOS = async (req, res) => {
	try {
		const sosList = await SOS.find({
			isResolved: false,
			isContact: false,
		}).populate("user", "-password");
		if (!sosList) return res.status(404).json({ message: "No SOS found" });

		res.status(200).json(sosList);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error", error });
	}
};

export const getAllMySOS = async (req, res) => {
	try {
		const { myId } = req.body;
		const myUser = await User.findById(myId);
		if (!myUser) return res.status(404).json({ message: "User not found" });
		const sosList = await SOS.find({ user: myId }).populate(
			"user",
			"-password"
		);

		if (!sosList || sosList.length === 0) {
			return res.status(200).json([]);
		}

		res.status(200).json(sosList);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error", error });
	}
};

export const acceptSOS = async (req, res) => {
	try {
		const { sosId, userId } = req.body;

		const sos = await SOS.findById(sosId);
		if (!sos) return res.status(404).json({ message: "SOS not found" });

		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		if (sos.acceptedBy.includes(userId)) {
			return res
				.status(400)
				.json({ message: "You have already accepted this SOS" });
		}

		sos.acceptedBy.push(userId);
		await sos.save();

		// Get the SOS creator
		const sosCreator = await User.findById(sos.user);
		if (sosCreator) {
			// Create notification record
			const notification = new Notification({
				recipient: sosCreator._id,
				type: "SOS",
				title: "SOS Request Accepted",
				message: `${user.name} has accepted your SOS request and is on the way to help.`,
				relatedId: sosId,
				onModel: "SOS",
				metadata: {
					volunteerId: userId,
					volunteerName: user.name,
				},
			});
			await notification.save();

			// Send real-time notification
			if (sosCreator.socketId) {
				io.to(sosCreator.socketId).emit("sosAccepted", {
					sosId,
					volunteer: {
						id: userId,
						name: user.name,
					},
					notification,
				});
			}

			// Create a chat room between the SOS creator and the volunteer
			try {
				console.log(
					`Creating SOS chat between user ${sosCreator._id} and volunteer ${userId}`
				);

				// Check if a chat already exists between these users for this SOS
				const existingChat = await Chat.findOne({
					participants: { $all: [sosCreator._id, userId] },
					relatedSOS: sosId,
				});

				if (!existingChat) {
					// Create a new chat for this SOS emergency
					const chat = new Chat({
						participants: [sosCreator._id, userId],
						relatedSOS: sosId,
						messages: [
							{
								sender: userId,
								content: `I've accepted your SOS request and am on my way to help. Please stay calm.`,
								timestamp: new Date(),
								readBy: [{ user: userId }],
							},
						],
						lastMessage: {
							content: `I've accepted your SOS request and am on my way to help. Please stay calm.`,
							sender: userId,
							timestamp: new Date(),
						},
					});

					await chat.save();
					console.log(`SOS chat created with ID: ${chat._id}`);

					// Notify the SOS creator about the new chat
					if (sosCreator.socketId) {
						io.to(sosCreator.socketId).emit("newChat", {
							chat: {
								_id: chat._id,
								participants: [
									{
										_id: sosCreator._id,
										name: sosCreator.name,
									},
									{ _id: userId, name: user.name },
								],
								relatedSOS: sosId,
								lastMessage: chat.lastMessage,
							},
						});
					}
				}
			} catch (chatError) {
				console.error("Error creating SOS chat:", chatError);
				// Don't return error, as SOS was still accepted
			}
		}

		res.status(200).json({ message: "SOS accepted successfully", sos });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error", error });
	}
};

export const generateSafetyReport = async (req, res) => {
	try {
		// Get date range from request body (if provided)
		const { startDate, endDate } = req.body;

		// Build query based on date range
		let query = {};
		if (startDate || endDate) {
			query.createdAt = {};
			if (startDate) {
				query.createdAt.$gte = new Date(startDate);
			}
			if (endDate) {
				// Set the end date to the end of the day
				const endOfDay = new Date(endDate);
				endOfDay.setHours(23, 59, 59, 999);
				query.createdAt.$lte = endOfDay;
			}
		}

		// Fetch SOS cases with the date filter
		const sosCases = await SOS.find(query).populate("user", "name email");

		const report = sosCases.map((sos) => ({
			user: sos.user?.name || "Unknown",
			email: sos.user?.email || "Unknown",
			message: sos.message,
			coordinates: sos.coordinates,
			isResolved: sos.isResolved,
			createdAt: sos.createdAt,
			resolvedAt: sos.resolvedAt,
		}));

		res.status(200).json({
			message: "Safety report generated successfully",
			report,
		});
	} catch (error) {
		res.status(500).json({
			message: "Failed to generate safety report",
			error: error.message,
		});
	}
};

// Monitor active SOS cases
export const monitorActiveSOSCases = async (req, res) => {
	try {
		const activeSOSCases = await SOS.find({ isResolved: false }).populate(
			"user",
			"name email"
		);
		res.status(200).json(activeSOSCases);
	} catch (error) {
		console.error("Error fetching active SOS cases:", error);
		res.status(500).json({ message: "Failed to fetch active SOS cases" });
	}
};

// Get SOS Statistics for Dashboard
export const getSOSStatistics = async (req, res) => {
	try {
		// Count total resolved SOS cases
		const resolvedCount = await SOS.countDocuments({ isResolved: true });

		// Count active volunteers
		const activeVolunteers = await User.countDocuments({
			role: "volunteer",
			volunteerStatus: "active",
			isVerified: true,
		});

		// Count ongoing SOS cases
		const ongoingCount = await SOS.countDocuments({
			isResolved: false,
			isContact: false,
		});

		res.status(200).json({
			resolved: resolvedCount,
			ongoing: ongoingCount,
			activeVolunteers: activeVolunteers,
		});
	} catch (error) {
		console.error("Error getting SOS statistics:", error);
		res.status(500).json({ message: "Failed to get statistics" });
	}
};

export const getSOSDetails = async (req, res) => {
	try {
		const { id } = req.params;
		const sos = await SOS.findById(id)
			.populate("user")
			.populate("acceptedBy");

		if (!sos) {
			return res.status(404).json({ message: "SOS not found" });
		}

		res.status(200).json(sos);
	} catch (error) {
		console.error("Error fetching SOS details:", error);
		res.status(500).json({ message: "Server error" });
	}
};
