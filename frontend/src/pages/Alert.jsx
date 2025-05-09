import { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
	MapPin,
	User,
	AlertTriangle,
	CheckCircle,
	XCircle,
	Phone,
} from "lucide-react";

const Alert = () => {
	const socket = useSocket();
	const { token, user, loading } = useAuth();
	const [notifications, setNotifications] = useState([]);
	const navigate = useNavigate();

	useEffect(() => {
		if (loading) return;

		if (user && user.role !== "volunteer") {
			navigate("/");
		}
	}, [user]);

	useEffect(() => {
		// Fetch unresolved SOS on component mount
		const fetchUnresolvedSOS = async () => {
			try {
				const res = await fetch("http://localhost:5000/api/sos", {
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});
				if (res.ok) {
					const data = await res.json();
					setNotifications(data);
				} else {
					toast.error("Failed to fetch unresolved SOS.");
				}
			} catch (error) {
				toast.error("An error occurred while fetching SOS.");
			}
		};

		fetchUnresolvedSOS();
	}, [token]);

	useEffect(() => {
		if (socket) {
			socket.on("newSOS", (data) => {
				setNotifications((prev) => [data, ...prev]);
			});
		}
	}, [socket]);

	const handleAcceptSOS = async (sosId) => {
		try {
			const res = await fetch("http://localhost:5000/api/sos/acceptSOS", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ sosId, userId: user._id }),
			});
			if (res.ok) {
				toast.success("SOS accepted successfully!");
				setNotifications((prev) =>
					prev.map((sos) =>
						sos._id === sosId
							? {
									...sos,
									acceptedBy: [...sos.acceptedBy, user._id],
							  }
							: sos
					)
				);
			} else {
				toast.error("Failed to accept SOS.");
			}
		} catch (error) {
			toast.error("An error occurred while accepting SOS.");
		}
	};

	const handleResolveSOS = async (sosId) => {
		try {
			const res = await fetch(
				"http://localhost:5000/api/sos/setAsResolved",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ sosId }),
				}
			);
			if (res.ok) {
				toast.success("SOS marked as resolved!");
				setNotifications((prev) =>
					prev.filter((sos) => sos._id !== sosId)
				);
			} else {
				toast.error("Failed to resolve SOS.");
			}
		} catch (error) {
			toast.error("An error occurred while resolving SOS.");
		}
	};

	return (
		<div className="p-6 bg-gradient-to-r from-red-100 to-red-200 min-h-screen">
			<h1 className="text-4xl font-bold mb-6 text-red-700 text-center">
				🚨 Emergency Alerts
			</h1>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{notifications.length === 0 ? (
					<p className="text-gray-700 col-span-full text-center">
						No unresolved SOS yet.
					</p>
				) : (
					notifications.map((notification) => (
						<div
							key={notification._id}
							className="bg-white shadow-lg rounded-lg p-4 sm:p-6 border-l-4 border-red-500"
						>
							<div className="flex items-center mb-4">
								<AlertTriangle
									className="text-red-600 mr-2"
									size={24}
								/>
								<h2 className="text-xl font-semibold text-red-600">
									Emergency Alert
								</h2>
							</div>
							<p className="text-gray-800 mb-2 flex items-center">
								<User
									className="mr-2 text-gray-600"
									size={18}
								/>
								<strong>Requester:</strong>{" "}
								<span className="ml-1">
									{notification.user.name}
								</span>
							</p>
							<p className="text-gray-800 mb-2 flex items-center">
								<Phone
									className="mr-2 text-gray-600"
									size={18}
								/>
								<strong>Phone:</strong>{" "}
								<a
									href={`tel:${notification.user.phone}`}
									className="ml-1 text-blue-600 underline"
								>
									{notification.user.phone}
								</a>
							</p>
							<p className="text-gray-800 mb-2">
								<strong>Message:</strong> {notification.message}
							</p>
							<p className="text-gray-800 mb-2 flex items-center">
								<MapPin
									className="mr-2 text-gray-600"
									size={18}
								/>
								<strong>Location:</strong>{" "}
								<span className="ml-1">
									{notification.coordinates.latitude},{" "}
									{notification.coordinates.longitude}
								</span>
							</p>
							<p className="text-gray-800 mb-4">
								<strong>Accepted By:</strong>{" "}
								{notification.acceptedBy.length} people
							</p>
							<a
								href={`https://www.google.com/maps?q=${notification.coordinates.latitude},${notification.coordinates.longitude}`}
								target="_blank"
								rel="noopener noreferrer"
								className="block text-center bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition mb-4"
							>
								View on Google Maps
							</a>
							<div className="flex justify-between items-center">
								{notification.user._id === user._id ? (
									<button
										onClick={() =>
											handleResolveSOS(notification._id)
										}
										className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition"
									>
										Mark as Resolved
									</button>
								) : notification.acceptedBy.includes(
										user._id
								  ) ? (
									<div className="flex items-center text-green-600">
										<CheckCircle
											className="mr-2"
											size={18}
										/>
										<span>Accepted</span>
									</div>
								) : (
									<button
										onClick={() =>
											handleAcceptSOS(notification._id)
										}
										className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
									>
										Accept SOS
									</button>
								)}
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
};

export default Alert;
