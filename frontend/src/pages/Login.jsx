import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import TwoFactorAuth from "../components/TwoFactorAuth";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  // Handle input change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", formData);
      toast.success("Login successful!");
      localStorage.setItem("token", res.data.token);
      navigate("/dashboard"); // Redirect after login
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed!");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-semibold mb-6 text-center">Login</h2>
        {!isAuthenticated ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="email" name="email" placeholder="Email" onChange={handleChange} className="w-full p-2 border rounded" required />
            <input type="password" name="password" placeholder="Password" onChange={handleChange} className="w-full p-2 border rounded" required />
            <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Login</button>
          </form>
        ) : (
          <TwoFactorAuth email={formData.email} onVerified={() => navigate("/dashboard")} />
        )}
      </div>
      <div>
     
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" name="email" placeholder="Email" onChange={handleChange} className="w-full p-2 border rounded" required />
          <input type="password" name="password" placeholder="Password" onChange={handleChange} className="w-full p-2 border rounded" required />
          <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Login</button>
        </form>
      </div>
    </div>
  );
};

export default Login;

