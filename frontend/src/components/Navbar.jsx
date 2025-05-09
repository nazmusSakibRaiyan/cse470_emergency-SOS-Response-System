import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Notifications from "./Notifications";
import { useState, useEffect, useRef } from "react";

const Navbar = () => {
	const { user, logout } = useAuth();
	const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
	const adminDropdownRef = useRef(null);

	const toggleAdminDropdown = () => {
		setIsAdminDropdownOpen(!isAdminDropdownOpen);
	};

	const closeAdminDropdown = () => {
		setIsAdminDropdownOpen(false);
	};

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (adminDropdownRef.current && !adminDropdownRef.current.contains(event.target)) {
				closeAdminDropdown();
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	return (
		<nav className="bg-blue-600 p-4 flex flex-wrap items-center justify-between text-white">
			<Link to="/" className="text-xl font-bold">
				SOS App
			</Link>
			<div className="flex flex-wrap items-center space-x-4 mt-2 md:mt-0">
				{!user ? (
					<>
						<Link to="/login" className="mx-2">
							Login
						</Link>
						<Link to="/register" className="mx-2">
							Register
						</Link>
					</>
				) : (
					<>
						<Link to="/dashboard" className="mx-2">
							Dashboard
						</Link>
						<Link to="/profile" className="mx-2">
							Profile
						</Link>
						<Link to="/contact" className="mx-2">
							Contact
						</Link>
						<Link to="/sos" className="mx-2">
							SOS
						</Link>
						<Link to="/chat-list" className="mx-2">
							Chats
						</Link>
						
						{user.role === "admin" && (
							<>
								<div className="relative group mx-2" ref={adminDropdownRef}>
									<button className="flex items-center" onClick={toggleAdminDropdown}>
										Admin
										<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
										</svg>
									</button>
									<div className={`absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 ${isAdminDropdownOpen ? 'block' : 'hidden'}`}>
										<Link to="/user-approvals" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={closeAdminDropdown}>
											User Approvals
										</Link>
										<Link to="/user-management" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={closeAdminDropdown}>
											User Management
										</Link>
										<Link to="/blacklisted-users" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={closeAdminDropdown}>
											Blacklist Users
										</Link>
										<Link to="/active-sos" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={closeAdminDropdown}>
											Monitor Active SOS
										</Link>
										<Link to="/safety-reports" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={closeAdminDropdown}>
											Safety Reports
										</Link>
										<Link to="/broadcast" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={closeAdminDropdown}>
											Emergency Broadcast
										</Link>
										<Link to="/volunteer-verification" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={closeAdminDropdown}>
											Verify Volunteers
										</Link>
									</div>
								</div>
							</>
						)}
						
						{user.role === "volunteer" && (
							<>
								<Link to="/alert" className="mx-2">
									Alerts
								</Link>
								<Link to="/status" className="mx-2">
									Status
								</Link>
								<Link to="/volunteer-feedback" className="mx-2">
									Feedback
								</Link>
							</>
						)}
						<div className="mx-2 flex items-center">
							<Notifications />
						</div>
						<button
							onClick={logout}
							className="bg-red-500 px-3 py-1 rounded hover:bg-red-600"
						>
							Logout
						</button>
					</>
				)}
			</div>
		</nav>
	);
};

export default Navbar;
