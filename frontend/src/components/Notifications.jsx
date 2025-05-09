import React, { useState, useEffect } from "react";
import {
	Badge,
	IconButton,
	Menu,
	MenuItem,
	Divider,
	Typography,
	Button,
	ListItemIcon,
	ListItemText,
	CircularProgress,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import WarningIcon from "@mui/icons-material/Warning";
import ChatIcon from "@mui/icons-material/Chat";
import CampaignIcon from "@mui/icons-material/Campaign";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { format } from "date-fns";
import axios from "axios";

const Notifications = () => {
	const [anchorEl, setAnchorEl] = useState(null);
	const [notifications, setNotifications] = useState([]);
	const [sosAlerts, setSosAlerts] = useState([]); // New state for SOS alerts
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();
	const { user, token } = useAuth();
	const { unreadNotifications, resetUnreadNotifications } = useSocket();

	const open = Boolean(anchorEl);

	// Fetch notifications when component mounts
	useEffect(() => {
		if (user) {
			fetchNotifications();
			fetchUnresolvedSOS(); // Fetch unresolved SOS alerts
		}
	}, [user]);

	const fetchNotifications = async () => {
		if (!user) return;

		setLoading(true);
		try {
			const response = await axios.get(
				"http://localhost:5000/api/notifications",
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			);

			setNotifications(response.data);
		} catch (error) {
			console.error("Error fetching notifications:", error);
		} finally {
			setLoading(false);
		}
	};

	const fetchUnresolvedSOS = async () => {
		try {
			const response = await axios.get("http://localhost:5000/api/sos", {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
			setSosAlerts(response.data);
		} catch (error) {
			console.error("Error fetching unresolved SOS alerts:", error);
		}
	};

	const handleClick = (event) => {
		setAnchorEl(event.currentTarget);
		// When opening notifications, reset unread count
		resetUnreadNotifications();
		// Mark notifications as read
		if (notifications.some((notif) => !notif.isRead)) {
			markAllAsRead();
		}
	};

	const handleClose = () => {
		setAnchorEl(null);
	};

	const markAllAsRead = async () => {
		try {
			await axios.put(
				"http://localhost:5000/api/notifications/mark-all-read",
				{},
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			);

			// Update local notification state to mark all as read
			setNotifications(
				notifications.map((notif) => ({
					...notif,
					isRead: true,
				}))
			);
		} catch (error) {
			console.error("Error marking notifications as read:", error);
		}
	};

	const handleNotificationClick = (notification) => {
		handleClose();

		// Navigate based on notification type
		switch (notification.type) {
			case "SOS":
				navigate(`/sos/${notification.relatedId}`);
				break;
			case "CHAT":
				navigate(`/chat/${notification.relatedId}`);
				break;
			case "BROADCAST":
				navigate("/broadcast");
				break;
			default:
				// Default action is to do nothing
				break;
		}

		// Mark this specific notification as read
		if (!notification.isRead) {
			markAsRead(notification._id);
		}
	};

	const markAsRead = async (notificationId) => {
		try {
			await axios.put(
				`http://localhost:5000/api/notifications/${notificationId}/read`,
				{},
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			);

			// Update local state
			setNotifications(
				notifications.map((notif) =>
					notif._id === notificationId
						? { ...notif, isRead: true }
						: notif
				)
			);
		} catch (error) {
			console.error("Error marking notification as read:", error);
		}
	};

	// Helper function to get the right icon for each notification type
	const getNotificationIcon = (type) => {
		switch (type) {
			case "SOS":
				return <WarningIcon color="error" />;
			case "CHAT":
				return <ChatIcon color="primary" />;
			case "BROADCAST":
				return <CampaignIcon color="action" />;
			default:
				return <NotificationsIcon color="disabled" />;
		}
	};

	// Format the timestamp
	const formatTime = (timestamp) => {
		try {
			return format(new Date(timestamp), "MMM d, h:mm a");
		} catch (error) {
			return "Unknown time";
		}
	};

	return (
		<div>
			<IconButton
				onClick={handleClick}
				size="large"
				aria-controls={open ? "notifications-menu" : undefined}
				aria-haspopup="true"
				aria-expanded={open ? "true" : undefined}
				color="inherit"
			>
				<Badge badgeContent={unreadNotifications} color="error">
					<NotificationsIcon />
				</Badge>
			</IconButton>

			<Menu
				id="notifications-menu"
				anchorEl={anchorEl}
				open={open}
				onClose={handleClose}
				MenuListProps={{
					"aria-labelledby": "notifications-button",
				}}
				PaperProps={{
					style: {
						maxHeight: "400px",
						width: "350px",
					},
				}}
			>
				<div className="p-2 flex justify-between items-center">
					<Typography variant="subtitle1" className="font-bold">
						Notifications
					</Typography>
					{notifications.length > 0 && (
						<Button
							size="small"
							onClick={markAllAsRead}
							startIcon={<CheckCircleIcon fontSize="small" />}
						>
							Mark all read
						</Button>
					)}
				</div>

				<Divider />

				{/* Display unresolved SOS alerts */}
				{sosAlerts.length > 0 && (
					<>
						<Typography
							variant="subtitle2"
							className="px-4 pt-2 font-bold"
						>
							Unresolved SOS Alerts
						</Typography>
						{sosAlerts.map((sos) => (
							<MenuItem
								key={sos._id}
								onClick={() => navigate(`/sos/${sos._id}`)}
							>
								<ListItemIcon>
									<WarningIcon color="error" />
								</ListItemIcon>
								<ListItemText
									primary={`SOS from ${
										sos.user?.name || "Unknown"
									}`}
									secondary={new Date(
										sos.createdAt
									).toLocaleString()}
								/>
							</MenuItem>
						))}
						<Divider />
					</>
				)}

				{loading ? (
					<div className="flex justify-center p-4">
						<CircularProgress size={24} />
					</div>
				) : notifications.length === 0 ? (
					<MenuItem disabled>
						<Typography variant="body2" className="text-gray-500">
							No notifications
						</Typography>
					</MenuItem>
				) : (
					notifications.map((notification) => (
						<React.Fragment key={notification._id}>
							<MenuItem
								onClick={() =>
									handleNotificationClick(notification)
								}
								selected={!notification.isRead}
								className={
									!notification.isRead ? "bg-blue-50" : ""
								}
							>
								<ListItemIcon>
									{getNotificationIcon(notification.type)}
								</ListItemIcon>
								<ListItemText
									primary={notification.title}
									secondary={
										<div className="flex flex-col">
											<span>{notification.message}</span>
											<span className="text-xs text-gray-500 mt-1">
												{formatTime(
													notification.createdAt
												)}
											</span>
										</div>
									}
								/>
							</MenuItem>
							<Divider component="li" />
						</React.Fragment>
					))
				)}
			</Menu>
		</div>
	);
};

export default Notifications;
