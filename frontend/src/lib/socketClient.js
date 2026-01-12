// src/lib/socketClient.js
import { io } from "socket.io-client";

let socket = null;
let refCounter = 0; // Reference counter

export const initializeSocket = (userId) => {
  if (socket) {
    refCounter++;
    console.log(`[Socket] Reusing existing socket. Users: ${refCounter}`);
    return socket;
  }

  console.log("[Socket] Creating new persistent socket connection...");
  const baseURL = "http://localhost:7000"; // Ensure this port is correct

  socket = io(baseURL, {
    query: { userId },
    withCredentials: true,
    transports: ["websocket"],
    reconnectionAttempts: 5,
    timeout: 10000,
  });

  refCounter = 1;

  socket.on("connect", () => {
    console.log("✅ [Socket] Connected, id:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.warn("❌ [Socket] Disconnected:", reason);
    // Important: Only nullify if the server disconnects, not on manual client disconnect
    if (reason === "io server disconnect" || reason === "transport close") {
       console.log("[Socket] Server disconnected, resetting socket state.");
       socket = null;
       refCounter = 0;
    }
  });

  socket.on("connect_error", (err) => {
    console.error("🚨 [Socket] Connection error:", err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  refCounter--;
  console.log(`[Socket] Component unmounted. Users remaining: ${refCounter}`);
  if (socket && refCounter <= 0) {
    console.log("🔌 [Socket] No users left, disconnecting socket.");
    socket.disconnect();
    socket = null;
    refCounter = 0;
  }
};

// Add an explicit disconnect for logout, if needed elsewhere
export const forceDisconnectSocket = () => {
    if (socket) {
        console.log("🔌 [Socket] Forcing disconnect on logout.");
        socket.disconnect();
        socket = null;
        refCounter = 0;
    }
}