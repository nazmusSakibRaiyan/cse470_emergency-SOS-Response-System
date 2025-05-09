import { useEffect, useState, useRef } from "react";
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
	const { socket, updateVolunteerLocation } = useSocket();
	const { token, user, loading } = useAuth();
	const [notifications, setNotifications] = useState([]);
	const [acceptedSOS, setAcceptedSOS] = useState(new Set());
	const locationIntervalRefs = useRef({});
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
					
					// Check if the volunteer has already accepted any of these SOS alerts
					data.forEach(sos => {
						if (sos.acceptedBy.includes(user._id)) {
							setAcceptedSOS(prev => new Set([...prev, sos._id]));
							startLocationTracking(sos._id);
						}
					});
				} else {
					toast.error("Failed to fetch unresolved SOS.");
				}
			} catch (error) {
				toast.error("An error occurred while fetching SOS.");
			}
		};

		if (token && user) {
			fetchUnresolvedSOS();
		}
		
		return () => {
			// Clean up location tracking intervals when component unmounts
			Object.values(locationIntervalRefs.current).forEach(interval => {
				clearInterval(interval);
			});
		};
	}, [token, user]);

	useEffect(() => {
		if (socket) {
			socket.on("newSOS", (data) => {
				setNotifications((prev) => [data, ...prev]);
			});
			
			// Listen for SOS resolution notifications
			socket.on("sosResolved", (data) => {
				toast.info(`SOS alert has been resolved by the user.`);
				
				// Stop location tracking for this SOS
				if (locationIntervalRefs.current[data.sosId]) {
					clearInterval(locationIntervalRefs.current[data.sosId]);
					delete locationIntervalRefs.current[data.sosId];
				}
				
				// Remove the resolved SOS from the notifications list
				setNotifications(prev => prev.filter(sos => sos._id !== data.sosId));
				
				// Remove from accepted SOS set
				setAcceptedSOS(prev => {
					const updated = new Set(prev);
					updated.delete(data.sosId);
					return updated;
				});
			});
		}
		
		return () => {
			if (socket) {
				socket.off("newSOS");
				socket.off("sosResolved");
			}
		};
	}, [socket]);

	// Start sending periodic location updates after accepting an SOS
	const startLocationTracking = (sosId) => {
		// Clear any existing interval for this SOS
		if (locationIntervalRefs.current[sosId]) {
			clearInterval(locationIntervalRefs.current[sosId]);
		}
		
		// Function to send current location
		const sendLocation = () => {
			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(
					(position) => {
						const coordinates = {
							latitude: position.coords.latitude,
							longitude: position.coords.longitude
						};
						updateVolunteerLocation(sosId, coordinates);
					},
					(error) => {
						console.error("Error getting location:", error);
					}
				);
			}
		};
		
		// Send location immediately
		sendLocation();
		
		// Then send every 30 seconds
		const intervalId = setInterval(sendLocation, 30000);
		locationIntervalRefs.current[sosId] = intervalId;
	};

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
				
				// Update UI to show this SOS as accepted
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
				
				// Add to set of accepted SOS
				setAcceptedSOS(prev => new Set([...prev, sosId]));
				
				// Start sending location updates
				startLocationTracking(sosId);
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
				
				// Stop location tracking for this SOS
				if (locationIntervalRefs.current[sosId]) {
					clearInterval(locationIntervalRefs.current[sosId]);
					delete locationIntervalRefs.current[sosId];
				}
				
				// Remove from accepted SOS set
				setAcceptedSOS(prev => {
					const updated = new Set(prev);
					updated.delete(sosId);
					return updated;
				});
				
				// Remove from notifications
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
								) : acceptedSOS.has(notification._id) ? (
									<div className="flex items-center text-green-600">
										<CheckCircle
											className="mr-2"
											size={18}
										/>
										<span>Accepted (Sending location updates)</span>
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
