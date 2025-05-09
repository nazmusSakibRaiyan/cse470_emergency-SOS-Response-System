import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = () => {
	const { user, loading } = useAuth();

	if (loading) {
		return <div>Loading...</div>; // Show a loading indicator while fetching user data
	}

	return user ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
