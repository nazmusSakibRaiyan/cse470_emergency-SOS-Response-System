import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/auth/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessage(res.data.message);
      } catch (error) {
        console.error("Error fetching dashboard:", error);
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    fetchDashboard();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-md w-96 text-center">
        <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
        <p>{message}</p>
        <button 
          className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
          onClick={() => { localStorage.removeItem("token"); navigate("/login"); }}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard;

