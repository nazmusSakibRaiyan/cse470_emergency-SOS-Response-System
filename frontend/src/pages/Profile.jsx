import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Profile = () => {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        address: "",
        nid: "",
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || "",
                email: user.email || "",
                phone: user.phone || "",
                address: user.address || "",
                nid: user.nid || "",
            });
            setIsLoading(false);
        } else {
            // If user data isn't loaded yet, try fetching it
            const fetchUserData = async () => {
                try {
                    const response = await axios.get("http://localhost:5000/api/auth/user", {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (response.data && response.data.user) {
                        const fetchedUser = response.data.user;
                        setFormData({
                            name: fetchedUser.name || "",
                            email: fetchedUser.email || "",
                            phone: fetchedUser.phone || "",
                            address: fetchedUser.address || "",
                            nid: fetchedUser.nid || "",
                        });
                    }
                } catch (error) {
                    console.error("Error fetching user data for profile:", error);
                    toast.error("Failed to load profile data.");
                } finally {
                    setIsLoading(false);
                }
            };
            if (token) {
                fetchUserData();
            } else {
                setIsLoading(false);
                toast.error("You are not logged in.");
                navigate("/login");
            }
        }
    }, [user, token, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            console.log("Updating profile with data:", formData);
            const response = await axios.put(
                "http://localhost:5000/api/auth/update-profile",
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log("Profile update response:", response.data);
            toast.success("Profile updated successfully!");
            // Update user context if your AuthContext supports it
            if (response.data && response.data.user) {
                // Since we can't directly update the user in AuthContext from here,
                // we can reload the page to get fresh user data
                window.location.reload();
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error(error.response?.data?.message || "Failed to update profile.");
        }
    };

    const handleDeleteAccount = async () => {
        if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
            try {
                await axios.delete("http://localhost:5000/api/auth/delete-account", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                toast.success("Account deleted successfully.");
                logout(); // Log out the user
                navigate("/"); // Redirect to homepage
            } catch (error) {
                console.error("Error deleting account:", error);
                toast.error(error.response?.data?.message || "Failed to delete account.");
            }
        }
    };

    if (isLoading) {
        return <div className="p-6">Loading profile...</div>;
    }

    return (
        <div className="p-6 max-w-md mx-auto bg-white shadow-md rounded-lg">
            <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">Your Profile</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                        type="text"
                        name="name"
                        id="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                        type="email"
                        name="email"
                        id="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                        type="text"
                        name="phone"
                        id="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                    <input
                        type="text"
                        name="address"
                        id="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="nid" className="block text-sm font-medium text-gray-700">NID</label>
                    <input
                        type="text"
                        name="nid"
                        id="nid"
                        value={formData.nid}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                <button
                    type="submit"
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Update Profile
                </button>
            </form>
            <div className="mt-8 border-t pt-6">
                <h2 className="text-lg font-medium text-red-600">Account Deactivation</h2>
                <p className="text-sm text-gray-600 mt-1 mb-3">
                    If you wish to delete your account, please be aware that this action is permanent and cannot be undone.
                </p>
                <button
                    onClick={handleDeleteAccount}
                    className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                    Delete My Account
                </button>
            </div>
        </div>
    );
};

export default Profile;
