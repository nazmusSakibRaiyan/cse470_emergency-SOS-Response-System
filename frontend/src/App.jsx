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
						<Route element={<ProtectedRoute />}>
							<Route path="/dashboard" element={<Dashboard />} />
							<Route path="/contact" element={<Contact />} />
							<Route path="/sos" element={<SOS />} />
							<Route path="/alert" element={<Alert />} />
						</Route>
					</Routes>
				</SocketProvider>
			</SOSModalProvider>
		</AuthProvider>
	</Router>
);

export default App;
