import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import sosRoutes from "./routes/sosRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import userRoute from "./routes/userRoute.js";
import { Server } from "socket.io";

import broadcastRoutes from "./routes/broadcastRoutes.js";
import userManagementRoutes from "./routes/userManagementRoutes.js";
import blacklistUserRoutes from "./routes/blacklistUserRoutes.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

mongoose
	.connect(process.env.MONGO_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => console.log("Connected to MongoDB"))
	.catch((err) => console.error("Failed to connect to MongoDB", err));

app.use("/api/auth", authRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/user", userRoute);
app.use("/api/broadcast", broadcastRoutes);
app.use("/api/user-management", userManagementRoutes);
app.use("/api/blacklist-users", blacklistUserRoutes);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () =>
	console.log(`Server running on port ${PORT}`)
);

const io = new Server(server, {
	cors: {
		origin: "*",
	},
});

io.on("connection", (socket) => {
	console.log("A user connected:", socket.id);
	socket.on("disconnect", () => {
		console.log("A user disconnected:", socket.id);
	});
});

export { io };
