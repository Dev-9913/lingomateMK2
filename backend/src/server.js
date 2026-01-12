// server.js

import express from "express";
import http from "http";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import conversationRoutes from "./routes/conversation.route.js";
import messageRoutes from "./routes/message.route.js";

import { connectDB } from "./lib/db.js";
import { initSocket, setIOInstance } from "./lib/socket.js";

const app = express();
const PORT = process.env.PORT;

// Middlewares
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));  // parse URL-encoded bodies
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/conversations",conversationRoutes);
app.use("/api/messages",messageRoutes);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);
setIOInstance(io);

// Start server
server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await connectDB();
});
