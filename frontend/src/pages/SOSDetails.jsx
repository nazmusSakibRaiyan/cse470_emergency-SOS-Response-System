import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import axios from "axios";

const SOSDetails = () => {
	const { id } = useParams();
	const { token, user } = useAuth();
	const navigate = useNavigate();
	const [sosDetails, setSosDetails] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchSOSDetails = async () => {
			try {
				const response = await axios.get(
					`http://localhost:5000/api/sos/${id}`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
						},
					}
				);
				setSosDetails(response.data.sos);
			} catch (error) {
				toast.error("Failed to fetch SOS details.");
			} finally {
				setLoading(false);
			}
		};

		fetchSOSDetails();
	}, [id, token]);

	const downloadCSV = () => {
		if (!sosDetails || !sosDetails.acceptedBy.length) {
			toast.error("No responder details available to download.");
			return;
		}

		const headers = ["Name", "Email"];
		const rows = sosDetails.acceptedBy.map((responder) => [
			responder.name,
			responder.email,
		]);

		const csvContent =
			"data:text/csv;charset=utf-8," +
			[headers, ...rows].map((e) => e.join(",")).join("\n");

		const encodedUri = encodeURI(csvContent);
		const link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", "responders.csv");
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-gray-500">Loading...</div>
			</div>
		);
	}

	if (!sosDetails) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-gray-500">SOS not found.</div>
			</div>
		);
	}

	return (
		<div className="p-6 bg-gray-100 min-h-screen">
			<div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
				<h1 className="text-3xl font-bold text-red-600 mb-6">
					SOS Details
				</h1>
				<div className="mb-6">
					<p className="text-lg">
						<strong className="font-semibold text-gray-700">
							Posted By:
						</strong>{" "}
						<span className="text-gray-600">
							{sosDetails.user.name}
						</span>
						{sosDetails.user._id !== user._id && (
							<button
								className="bg-blue-600 ms-4 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
								onClick={() =>
									navigate(`/chats/${sosDetails.user._id}`)
								}
							>
								Send Message
							</button>
						)}
					</p>
					<p className="text-lg">
						<strong className="font-semibold text-gray-700">
							Message:
						</strong>{" "}
						<span className="text-gray-600">
							{sosDetails.message}
						</span>
					</p>
					<p className="text-lg">
						<strong className="font-semibold text-gray-700">
							Location:
						</strong>{" "}
						<span className="text-gray-600">
							{sosDetails.coordinates.latitude},{" "}
							{sosDetails.coordinates.longitude}
						</span>
					</p>
					<a
						href={`https://www.google.com/maps?q=${sosDetails.coordinates.latitude},${sosDetails.coordinates.longitude}`}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-block mt-4 text-blue-500 underline"
					>
						View on Google Maps
					</a>
				</div>
				<h2 className="text-2xl font-semibold text-gray-800 mb-4">
					Responders
				</h2>
				<button
					className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition mb-4"
					onClick={downloadCSV}
				>
					Download CSV
				</button>
				<ul className="space-y-4">
					{sosDetails.acceptedBy.map((responder) => (
						<li
							key={responder._id}
							className="flex items-center justify-between bg-gray-50 p-4 rounded-lg shadow-sm"
						>
							<div>
								<p className="text-lg font-medium text-gray-700">
									{responder.name}
								</p>
								<p className="text-sm text-gray-500">
									{responder.email}
								</p>
							</div>
							{user._id !== responder._id && (
								<button
									className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
									onClick={() =>
										navigate(`/chats/${responder._id}`)
									}
								>
									Send Message
								</button>
							)}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
};

export default SOSDetails;
