import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ adminOnly }) => {
	const { user, loading } = useAuth();

	if (loading) {
		return <div>Loading...</div>; // Show a loading indicator while fetching user data
	}

	// Not authenticated
	if (!user) {
		return <Navigate to="/login" />;
	}

	// Admin only route but user is not admin
	if (adminOnly && user.role !== "admin") {
		return <Navigate to="/dashboard" />;
	}

	return <Outlet />;
};

export default ProtectedRoute;
