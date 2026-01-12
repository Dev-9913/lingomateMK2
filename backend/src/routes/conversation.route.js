import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getConversationDetails,
  getConversationById,
  updateChatMode,
} from "../controller/conversation.controller.js";

const router = express.Router();

// Protect all conversation routes
router.use(protectRoute);

// Get conversation details (including participant modes)
router.get("/", getConversationDetails);
// Get conversation by ID
router.get("/:conversationId", getConversationById);


// Update current user's chat mode in a conversation
router.put("/:conversationId/mode", updateChatMode);




export default router;
