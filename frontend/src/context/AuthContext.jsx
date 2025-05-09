// src/context/AuthContext.js

import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

const AuthContext = createContext();

export const useAuth = () => {
	return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
	const navigate = useNavigate();
	const [user, setUser] = useState(null);
	const [token, setToken] = useState(localStorage.getItem("token") || null);
	const [loading, setLoading] = useState(true); // Add loading state

	useEffect(() => {
		if (token) {
			fetchUserData();
		} else {
			setLoading(false); // No token, stop loading
		}
	}, [token]);

	const fetchUserData = async () => {
		try {
			const baseURI =
				process.env.NODE_ENV === "development"
					? "http://localhost:5000"
					: ""; //student Id: 21201197
			const res = await fetch(baseURI + "/api/auth/user", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (res.ok) {
				const data = await res.json();
				setUser(data.user);
			} else {
				logout();
			}
		} catch (error) {
			logout();
			toast.error("Failed to fetch user data.");
		} finally {
			setLoading(false); // Stop loading after fetching user data
		}
	};

	const login = (token, user) => {
		setToken(token);
		setUser(user);
		localStorage.setItem("token", token);
		toast.success("Login successful!");
		navigate("/dashboard");
	};

	const logout = () => {
		setUser(null);
		setToken(null);
		localStorage.removeItem("token");
		navigate("/login");
		toast.success("Logged out successfully.");
	};

	const getUser = () => user;

	const getToken = () => token;

	return (
		<AuthContext.Provider
			value={{ user, token, login, logout, loading, getUser, getToken }}
		>
			{children}
		</AuthContext.Provider>
	);
};
