import { useSOSModal } from "../context/SOSModalContext";
import { useAuth } from "../context/AuthContext";

const SOSModal = () => {
	const { sosData, hideSOSModal } = useSOSModal();
	const { user } = useAuth();

	if (!sosData || sosData.user._id === user._id) return null;

	const handleAccept = async () => {
		try {
			await fetch("http://localhost:5000/api/sos/acceptSOS", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${user.token}`,
				},
				body: JSON.stringify({
					sosId: sosData._id,
					userId: user._id,
				}),
			});
			hideSOSModal();
		} catch (error) {
			console.error("Failed to accept SOS:", error);
		}
	};

	return (
		<div className="fixed inset-0 bg-[rgba(0,0,0,0.80)] backdrop-blur-lg flex items-center justify-center z-50">
			<div className="relative p-6 sm:p-8 w-11/12 sm:w-96">
				<div className="absolute inset-0  animate-warning-tape rounded-xl"></div>
				<div className="relative bg-white rounded-xl shadow-2xl p-6 sm:p-8">
					<div className="flex justify-between items-center mb-6">
						<h2 className="text-xl sm:text-2xl font-bold text-red-600 flex items-center">
							<span className="mr-2">🚨</span> Emergency Alert
						</h2>
						<button
							onClick={hideSOSModal}
							className="text-gray-500 hover:text-gray-800 text-2xl"
						>
							&times;
						</button>
					</div>
					<div className="space-y-4">
						<p className="text-gray-800">
							<strong className="font-semibold">
								Requester:
							</strong>{" "}
							<span className="text-gray-600">
								{sosData.user.name}
							</span>
						</p>
						<p className="text-gray-800">
							<strong className="font-semibold">Message:</strong>{" "}
							<span className="text-gray-600">
								{sosData.message}
							</span>
						</p>
						<p className="text-gray-800">
							<strong className="font-semibold">Location:</strong>{" "}
							<span className="text-gray-600">
								{sosData.location.latitude},{" "}
								{sosData.location.longitude}
							</span>
						</p>
						<a
							href={`https://www.google.com/maps?q=${sosData.location.latitude},${sosData.location.longitude}`}
							target="_blank"
							rel="noopener noreferrer"
							className="block text-center bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition"
						>
							View on Google Maps
						</a>
					</div>
					<div className="mt-6 flex justify-between items-center">
						<button
							onClick={hideSOSModal}
							className="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition"
						>
							Reject
						</button>
						<button
							onClick={handleAccept}
							className="bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 transition"
						>
							Accept SOS
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default SOSModal;
