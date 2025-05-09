import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { SOSModalProvider } from "./context/SOSModalContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { Toaster } from "react-hot-toast";
import Contact from "./pages/Contact";
import SOS from "./pages/SOS";
import Alert from "./pages/Alert";
import SOSModal from "./components/SOSModal";
import Broadcast from "./pages/Broadcast";
import UserManagement from "./pages/UserManagement";
import BlacklistUsers from "./pages/BlacklistUsers";
import Status from "./pages/Status";

const App = () => (
	<Router>
		<AuthProvider>
			<SOSModalProvider>
				<SocketProvider>
					<Navbar />
					<SOSModal />
					<Toaster position="top-right" />
					<Routes>
						<Route path="/" element={<HomePage />} />
						<Route path="/register" element={<Register />} />
						<Route path="/login" element={<Login />} />
						<Route path="/status" element={<Status />} />
						<Route element={<ProtectedRoute />}>
							<Route path="/dashboard" element={<Dashboard />} />
							<Route path="/contact" element={<Contact />} />
							<Route path="/sos" element={<SOS />} />
							<Route path="/alert" element={<Alert />} />
							<Route path="/broadcast" element={<Broadcast />} />
							<Route
								path="/user-management"
								element={<UserManagement />}
							/>
							<Route
								path="/blacklisted-users"
								element={<BlacklistUsers />}
							/>
						</Route>
					</Routes>
				</SocketProvider>
			</SOSModalProvider>
		</AuthProvider>
	</Router>
);

export default App;
