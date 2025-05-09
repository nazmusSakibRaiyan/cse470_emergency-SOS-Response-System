import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function SOS() {
	const { user, token } = useAuth();
	const [coordinates, setCoordinates] = useState(null);
	const [locationName, setLocationName] = useState("Fetching location...");
	const [message, setMessage] = useState("");
	const [receiver, setReceiver] = useState("volunteer");
	const [loading, setLoading] = useState(false);
	const [mySOS, setMySOS] = useState([]);
	const [nonResolvedSOS, setNonResolvedSOS] = useState([]);

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
		} catch (error) {
			toast.error("Failed to fetch your SOS");
		} finally {
			setLoading(false);
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

			<div className="bg-white mb-6 p-4 sm:p-6 rounded shadow border-l-4 border-yellow-500">
				<h2 className="text-xl font-semibold mb-4 text-yellow-600">
					🚨 Emergency SOS
				</h2>
				{loading ? (
					<p className="text-gray-700">Loading...</p>
				) : (
					<ul>
						{nonResolvedSOS.map((sos) => (
							<li key={sos._id} className="mb-4 border-b pb-4">
								<p className="text-gray-800">
									<strong>User:</strong> {sos.user.name}
								</p>
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
							</li>
						))}
					</ul>
				)}
			</div>

			<div className="bg-white p-4 sm:p-6 rounded shadow border-l-4 border-green-500">
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
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
