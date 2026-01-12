import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getMessagesInConversation,
  sendMessage,
  deleteMessage,
  editMessage,
  toggleReactionOnMessage
} from "../controller/message.controller.js";
import { upload } from "../middleware/upload.middleware.js";
import { getOnlineUsers } from "../lib/socket.js";

const Router = express.Router();

// Protect all message routes
Router.use(protectRoute);

// Get all messages in a conversation
Router.get("/conversation/:conversationId", getMessagesInConversation);

// Send a message (text or media) to a conversation
Router.post(
  "/conversation/:conversationId",
  upload.single("media"),
  sendMessage
);

// Delete a message
Router.delete("/:messageId", deleteMessage);

// Edit a message
Router.put("/:messageId", editMessage);

Router.post("/reactions/:messageId", toggleReactionOnMessage);      // Add or update or delete reaction


// Get online users
Router.get("/online", (req, res) => {
  res.json({
    onlineUsers: Object.keys(getOnlineUsers()),
  });
});

export default Router;
