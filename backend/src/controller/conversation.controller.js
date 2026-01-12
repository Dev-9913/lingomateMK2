import prisma from "../lib/db.js";
import { getIOInstance } from "../lib/socket.js";
// GET /conversation/
export const getConversationDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    const participantRecords = await prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    profilePic: true,
                    nativeLanguage: true,
                    learningLanguage: true,
                    lastSeen: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const conversations = participantRecords.map((participant) => {
      return {
        ...participant.conversation,
        unreadCount: participant.unreadCount,
        lastReadMessageId: participant.lastReadMessageId || null,
      };
    });

    res.status(200).json({ conversations });
  } catch (error) {
    console.error("Error fetching user conversations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/conversations/:conversationId
export const getConversationById = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = parseInt(req.params.conversationId, 10);

    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
      },
    });

    if (!participant) {
      return res.status(403).json({ error: "Not authorized to view this conversation." });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                profilePic: true,
                nativeLanguage: true,
                learningLanguage: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    // Extract and return user-specific info
    const participants = conversation.participants.map((p) => ({
      user: p.user,
      chatMode: p.chatMode,
      unreadCount: p.unreadCount,
      lastReadMessageId: p.lastReadMessageId || null,
    }));

    res.status(200).json({
      id: conversation.id,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      participants,
    });
  } catch (error) {
    console.error("Error fetching conversation by ID:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// PUT /conversation/:conversationId/mode
export const updateChatMode = async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId);
    const userId = req.user.id;
    const { chatMode } = req.body;

    if (!["LEARNING", "COMFORT", "BRIDGE"].includes(chatMode)) {
      return res.status(400).json({ error: "Invalid chat mode." });
    }

    const updated = await prisma.conversationParticipant.updateMany({
      where: {
        userId,
        conversationId,
      },
      data: {
        chatMode,
      },
    });

    if (updated.count === 0) {
      return res.status(404).json({ error: "Conversation participant not found." });
    }

    res.status(200).json({
      message: "Chat mode updated successfully",
      conversationId,
      userId,
      newMode: chatMode,
    });
  } catch (error) {
    console.error("Error updating chat mode:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

