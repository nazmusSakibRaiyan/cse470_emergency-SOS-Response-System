import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function SOS() {
	const navigate = useNavigate(); // Initialize the navigate function
	const { user, token } = useAuth();
	const { respondingVolunteers, socket } = useSocket();
	const [coordinates, setCoordinates] = useState(null);
	const [locationName, setLocationName] = useState("Fetching location...");
	const [message, setMessage] = useState("");
	const [receiver, setReceiver] = useState("volunteer");
	const [loading, setLoading] = useState(false);
	const [mySOS, setMySOS] = useState([]);
	const [nonResolvedSOS, setNonResolvedSOS] = useState([]);
	const [sosReadReceipts, setSosReadReceipts] = useState({});

	useEffect(() => {
		// Fetch user's current location
		navigator.geolocation.getCurrentPosition(
			async (position) => {
				const { latitude, longitude } = position.coords;
				setCoordinates({ latitude, longitude });

				// Fetch location name using a free API
				try {
					const res = await fetch(
						`https://geocode.maps.co/reverse?lat=${latitude}&lon=${longitude}`
					);
					const data = await res.json();
					setLocationName(data.display_name || "Unknown Location");
				} catch (error) {
					setLocationName("Failed to fetch location name");
				}
			},
			(error) => {
				toast.error("Failed to fetch location");
				setLocationName("Location access denied");
			}
		);

		// Fetch user's SOS
		fetchMySOS();

		// Fetch all non-resolved SOS
		fetchNonResolvedSOS();
	}, []);

	// Listen for SOS read receipts
	useEffect(() => {
		if (!socket) return;

		const handleSOSReadReceipt = (data) => {
			const { sosId, volunteer, readAt } = data;
			
			setSosReadReceipts(prev => ({
				...prev,
				[sosId]: [
					...(prev[sosId] || []),
					{
						volunteerId: volunteer.id,
						volunteerName: volunteer.name,
						readAt
					}
				]
			}));
		};

		socket.on('sosReadReceipt', handleSOSReadReceipt);

		return () => {
			socket.off('sosReadReceipt', handleSOSReadReceipt);
		};
	}, [socket]);

	const fetchMySOS = async () => {
		try {
			setLoading(true);
			const res = await fetch("http://localhost:5000/api/sos/mySOS", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ myId: user._id }),
			});
			const data = await res.json();
			setMySOS(data);
			
			// Fetch read receipts for each SOS
			for (const sos of data) {
				if (!sos.isResolved) {
					fetchSOSDetails(sos._id);
				}
			}
		} catch (error) {
			toast.error("Failed to fetch your SOS");
		} finally {
			setLoading(false);
		}
	};
	
	const fetchSOSDetails = async (sosId) => {
		try {
			const response = await axios.get(
				`http://localhost:5000/api/sos/${sosId}`,
				{
					headers: {
						Authorization: `Bearer ${token}`
					}
				}
			);
			
			if (response.data.readReceipts) {
				setSosReadReceipts(prev => ({
					...prev,
					[sosId]: response.data.readReceipts
				}));
			}
		} catch (error) {
			console.error('Error fetching SOS details:', error);
		}
	};

	const fetchNonResolvedSOS = async () => {
		try {
			setLoading(true);
			const res = await fetch("http://localhost:5000/api/sos", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
			const data = await res.json();
			setNonResolvedSOS(data);
		} catch (error) {
			toast.error("Failed to fetch non-resolved SOS");
		} finally {
			setLoading(false);
		}
	};

	const sendSOS = async () => {
		if (!coordinates) {
			toast.error("Location not available");
			return;
		}

		try {
			setLoading(true);
			const endpoint =
				receiver === "silent"
					? "http://localhost:5000/api/sos/sendSilentSOS"
					: "http://localhost:5000/api/sos/sendSoftSOS";
			const res = await fetch(endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					userId: user._id,
					message,
					coordinates,
					receiver: receiver !== "silent" ? receiver : undefined,
				}),
			});
			if (res.ok) {
				toast.success("SOS sent successfully");
				fetchMySOS();
			} else {
				toast.error("Failed to send SOS");
			}
		} catch (error) {
			toast.error("An error occurred while sending SOS");
		} finally {
			setLoading(false);
		}
	};

	const resolveSOS = async (sosId) => {
		try {
			setLoading(true);
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
				toast.success("SOS marked as resolved");
				fetchMySOS();
				fetchNonResolvedSOS();
			} else {
				toast.error("Failed to resolve SOS");
			}
		} catch (error) {
			toast.error("An error occurred while resolving SOS");
		} finally {
			setLoading(false);
		}
	};

	// Helper function to check if a volunteer has responded to an SOS
	const hasResponders = (sosId) => {
		return respondingVolunteers[sosId] && Object.keys(respondingVolunteers[sosId]).length > 0;
	};
	
	// Helper to format date
	const formatDate = (date) => {
		return new Date(date).toLocaleString();
	};

	return (
		<div className="p-4 sm:p-6 bg-gray-100 min-h-screen">
			<h1 className="text-2xl sm:text-3xl font-bold mb-4 text-red-600">
				 🚨 SOS Page
			</h1>

			<div className="mb-6">
				<h2 className="text-xl font-semibold text-blue-600">
					📍 Current Location
				</h2>
				<p className="text-gray-700">{locationName}</p>
				{coordinates && (
					<a
						href={`https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`}
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-500 underline"
					>
						View in Google Maps
					</a>
				)}
			</div>

			<div className="mb-6 bg-white p-4 sm:p-6 rounded shadow border-l-4 border-red-500">
				<h2 className="text-xl font-semibold mb-4 text-red-600">
					 🆘 Send SOS
				</h2>
				<textarea
					className="w-full p-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
					placeholder="Enter your message"
					value={message}
					onChange={(e) => setMessage(e.target.value)}
				></textarea>
				<select
					className="w-full p-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
					value={receiver}
					onChange={(e) => setReceiver(e.target.value)}
				>
					<option value="volunteer">Volunteer</option>
					<option value="contact">Contact</option>
					<option value="silent">Silent SOS</option>
				</select>
				<button
					className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
					onClick={sendSOS}
					disabled={loading}
				>
					{loading ? "Sending..." : "Send SOS"}
				</button>
			</div>

			<div className="bg-white p-4 sm:p-6 rounded shadow border-l-4 border-green-500 mb-6">
				<h2 className="text-xl font-semibold mb-4 text-green-600">
					 📜 My SOS
				</h2>
				{loading ? (
					<p className="text-gray-700">Loading...</p>
				) : (
					<ul>
						{mySOS.map((sos) => (
							<li key={sos._id} className="mb-4 border-b pb-4">
								<p className="text-gray-800">
									<strong>Message:</strong> {sos.message}
								</p>
								<p className="text-gray-800">
									<strong>Location:</strong>{" "}
									{sos.coordinates.latitude},{" "}
									{sos.coordinates.longitude}
								</p>
								<a
									href={`https://www.google.com/maps?q=${sos.coordinates.latitude},${sos.coordinates.longitude}`}
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-500 underline"
								>
									View in Google Maps
								</a>
								<p className="text-gray-800">
									<strong>Status:</strong>{" "}
									<span
										className={`${
											sos.isResolved
												? "text-green-600"
												: "text-red-600"
										}`}
									>
										{sos.isResolved
											? "Resolved"
											: "Pending"}
									</span>
								</p>
								{!sos.isResolved && (
									<button
										className="bg-green-600 text-white py-1 px-3 rounded hover:bg-green-700"
										onClick={() => resolveSOS(sos._id)}
									>
										Mark as Resolved
									</button>
								)}
								
								{/* Show read receipts */}
								{sosReadReceipts[sos._id] && sosReadReceipts[sos._id].length > 0 && (
									<div className="mt-3">
										<h4 className="font-semibold text-blue-600">Seen by volunteers:</h4>
										<div className="bg-blue-50 p-3 rounded-lg mt-2 mb-3">
											{sosReadReceipts[sos._id].map((receipt, index) => (
												<div key={`${receipt.volunteerId}-${index}`} className="mb-2 text-sm">
													<p className="text-gray-800">
														<span className="font-medium">{receipt.volunteerName}</span> 
														<span className="text-gray-500 ml-2">
															{formatDate(receipt.readAt)}
														</span>
													</p>
												</div>
											))}
										</div>
									</div>
								)}
								
								{/* Show responding volunteers if there are any */}
								{!sos.isResolved && hasResponders(sos._id) && (
									<div className="mt-3">
										<h4 className="font-semibold text-blue-600">Responding Volunteers:</h4>
										<div className="bg-gray-50 p-3 rounded-lg mt-2 max-h-60 overflow-y-auto">
											{Object.entries(respondingVolunteers[sos._id]).map(([volunteerId, volunteer]) => (
												<div key={volunteerId} className="mb-2 border-b border-gray-200 pb-2">
													<p className="font-medium">{volunteer.name}</p>
													<p className="text-sm text-gray-600">
														Location: ({volunteer.coordinates.latitude.toFixed(6)}, 
														{volunteer.coordinates.longitude.toFixed(6)})
													</p>
													<p className="text-xs text-gray-500">
														Last updated: {new Date(volunteer.lastUpdated).toLocaleTimeString()}
													</p>
													<a 
														href={`https://www.google.com/maps?q=${volunteer.coordinates.latitude},${volunteer.coordinates.longitude}`} 
														target="_blank"
														rel="noopener noreferrer"
														className="text-blue-500 text-sm underline"
													>
														View volunteer on map
													</a>
												</div>
											))}
										</div>
									</div>
								)}
								
								{/* Button to start a chat with volunteers who accepted this SOS */}
								{!sos.isResolved && sos.acceptedBy && sos.acceptedBy.length > 0 && (
									<div className="mt-3">
										<button 
											className="bg-blue-600 text-white py-1 px-3 rounded hover:bg-blue-700"
											onClick={() => {
												// Show loading toast
												const loadingToast = toast.loading('Creating chat room...');
												
												// Log the structure of acceptedBy to debug
												console.log('AcceptedBy structure:', sos.acceptedBy);
												
												// Extract user IDs properly with better error checking
												const userIds = sos.acceptedBy.map(volunteer => {
													if (typeof volunteer === 'object' && volunteer !== null) {
														return volunteer._id || volunteer.id;
													}
													return volunteer;
												}).filter(id => id); // Remove any undefined values
												
												// Log the extracted userIds for debugging
												console.log('Extracted userIds:', userIds);
												
												// Create chat with responders
												fetch('http://localhost:5000/api/chat/create-sos-chat', {
													method: 'POST',
													headers: {
														'Content-Type': 'application/json',
														'Authorization': `Bearer ${token}`
													},
													body: JSON.stringify({
														sosId: sos._id,
														userIds: userIds
													})
												})
												.then(response => {
													if (!response.ok) {
														return response.json().then(err => {
															throw new Error(err.message || 'Server error');
														});
													}
													return response.json();
												})
												.then(data => {
													toast.dismiss(loadingToast);
													toast.success('Chat room created successfully');
													// Navigate to the chat page with the new chat's ID
													navigate(`/chat/${data._id}`);
												})
												.catch(error => {
													toast.dismiss(loadingToast);
													console.error('Error creating chat room:', error);
													toast.error(`Failed to create chat room: ${error.message || 'Unknown error'}`);
												});
											}}
										>
											Chat with Responders
										</button>
									</div>
								)}
							</li>
						))}
					</ul>
				)}
			</div>
			
			{/* Multi-location Map View (for future enhancement) */}
			{/* This would be a good place to add an embedded map showing both the user's location 
			    and all responding volunteers' locations on a single map */}
		</div>
	);
}
