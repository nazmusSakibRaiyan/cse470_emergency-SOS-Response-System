import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useSOSModal } from "./SOSModalContext";

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
	const [socket, setSocket] = useState(null);
	const { showSOSModal } = useSOSModal();

	useEffect(() => {
		const newSocket = io("http://localhost:5000");
		setSocket(newSocket);

		return () => newSocket.close();
	}, []);

	useEffect(() => {
		if (socket) {
			socket.on("newSOS", (data) => {
				showSOSModal(data);
			});
		}
		return () => socket?.off("newSOS");
	}, [socket, showSOSModal]);

	return (
		<SocketContext.Provider value={socket}>
			{children}
		</SocketContext.Provider>
	);
};
