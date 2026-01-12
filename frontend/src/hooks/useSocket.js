// src/hooks/useSocket.js
import { useEffect, useState } from "react";
import {
  initializeSocket,
  disconnectSocket,
  getSocket,
} from "../lib/socketClient.js";

export const useSocket = ({ user }) => {
  // Get the potentially existing socket instance immediately
  const [socket, setSocket] = useState(getSocket());
  // Reflect the current connection status
  const [isConnected, setIsConnected] = useState(socket?.connected || false);

  useEffect(() => {
    if (!user?.id) {
        // If user logs out, ensure cleanup happens
        disconnectSocket();
        setSocket(null);
        setIsConnected(false);
        return;
    };

    // Initialize or get existing socket, increment ref count
    const socketInstance = initializeSocket(user.id);
    setSocket(socketInstance); // Update state with the instance
    setIsConnected(socketInstance.connected); // Update connection status

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    // Register listeners
    socketInstance.on("connect", handleConnect);
    socketInstance.on("disconnect", handleDisconnect);

    // Cleanup: Remove listeners for this instance and decrement ref count
    return () => {
      // console.log("[useSocket] Cleanup: Removing listeners.");
      socketInstance.off("connect", handleConnect);
      socketInstance.off("disconnect", handleDisconnect);
      disconnectSocket(); // This will only disconnect if ref count hits 0
    };
  }, [user?.id]); // Re-run only if the user ID changes (login/logout)

  return { socket, isConnected };
};