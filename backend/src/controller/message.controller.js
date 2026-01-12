// controllers/message.controller.js

import { streamUpload } from "../lib/cloudinaryUpload.js";
import { getReceiverSocketId, getIOInstance } from "../lib/socket.js";
import { translateText } from "../lib/gemini.js";
import prisma from "../lib/db.js";

// -----------------------------
// GET MESSAGES IN CONVERSATION
// -----------------------------
export const getMessagesInConversation = async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId, 10);
    const userId = req.user.id;

    // Ensure participant exists
    const participant = await prisma.conversationParticipant.findUnique({
      where: { userId_conversationId: { userId, conversationId } },
    });
    if (!participant) {
      return res
        .status(403)
        .json({ error: "Not a participant in this conversation." });
    }

    // Find the other user ID
    const convo = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { select: { userId: true } } },
    });
    const otherUserId =
      convo.participants.find((p) => p.userId !== userId)?.userId || null;

    // Pagination params
    const page = Math.max(0, parseInt(req.query.page, 10) || 0);
    const pageSize = Math.max(1, parseInt(req.query.take, 10) || 20);

    // Total messages for hasMore
    const total = await prisma.message.count({ where: { conversationId } });

    // Fetch newest-first
    const fetched = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      skip: page * pageSize,
      take: pageSize,
      include: {
        sender: { select: { id: true, fullName: true, profilePic: true } },
        reactions: true,
      },
    });

    // Shape & reverse to chronological
    const shaped = fetched
      .map((msg) => {
        // ✅ If it's a call/system message, just show raw text
        if (msg.isCallSystem) {
          return {
            id: msg.id,
            text: msg.text,
            isCallSystem: true,
            mediaUrl: null,
            mediaType: null,
            sender: msg.sender,
            createdAt: msg.createdAt,
            updatedAt: msg.updatedAt,
            edited: msg.edited,
            deleted: msg.deleted,
            reactions: [],
            repliedToId: null,
            status: msg.status,
          };
        }

        // Otherwise normal message (apply translation rules)
        let displayedText =
          msg.senderId === userId
            ? msg.text
            : msg.translatedToLearning ??
              msg.translatedToNative ??
              (participant.chatMode === "LEARNING"
                ? msg.translatedToLearning || msg.text
                : participant.chatMode === "COMFORT"
                ? msg.translatedToNative || msg.text
                : msg.text);

        return {
          id: msg.id,
          text: displayedText,
          isCallSystem: false,
          mediaUrl: msg.mediaUrl,
          mediaType: msg.mediaType,
          sender: msg.sender,
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt,
          edited: msg.edited,
          deleted: msg.deleted,
          reactions: msg.reactions,
          repliedToId: msg.repliedToId,
          status: msg.status,
        };
      })
      .reverse();

    // Determine latest message in this page
    const latestMessage = shaped[shaped.length - 1];

    // Mark as read & emit
    if (latestMessage) {
      // reset my unread count
      await prisma.conversationParticipant.update({
        where: { userId_conversationId: { userId, conversationId } },
        data: { lastReadMessageId: latestMessage.id, unreadCount: 0 },
      });

      // mark all older > unread as READ
      await prisma.message.updateMany({
        where: {
          conversationId,
          senderId: { not: userId },
          status: { not: "READ" },
          id: { lte: latestMessage.id },
        },
        data: { status: "READ" },
      });

      // emit individual message_read events
      const toNotify = await prisma.message.findMany({
        where: {
          conversationId,
          senderId: { not: userId },
          status: "READ",
          id: { lte: latestMessage.id },
        },
        select: { id: true, senderId: true },
      });

      const io = getIOInstance();
      toNotify.forEach((m) => {
        const sock = getReceiverSocketId(m.senderId);
        if (sock)
          io.to(sock).emit("message_read", {
            messageId: m.id,
            conversationId,
            readerId: userId,
          });
      });

      // emit conversation read marker
      const recvSock = getReceiverSocketId(otherUserId);
      if (recvSock) {
        io.to(recvSock).emit("conversationRead", {
          conversationId,
          readerId: userId,
        });
      }
    }
    // log the fetch
    console.log(
      `📩 User ${userId} fetched ${
        shaped.length
      } messages from conversation ${conversationId} (page ${page}, pageSize ${pageSize}, total ${total}, hasMore: ${
        (page + 1) * pageSize < total
      })`
    );

    // Send back data + pagination info
    res.json({
      messages: shaped,
      otherUserId,
      lastReadMessageId:
        latestMessage?.id || participant.lastReadMessageId || null,
      page,
      pageSize,
      total,
      hasMore: (page + 1) * pageSize < total,
    });
  } catch (err) {
    console.error("getMessagesInConversation error:", err);
    res.status(500).json({ error: "Unable to fetch messages." });
  }
};

// -----------------------------
// SEND MESSAGE
// -----------------------------
export const sendMessage = async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId);
    const { text, repliedToId } = req.body;
    const senderId = req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: { user: true },
        },
      },
    });

    if (!conversation) {
      console.warn(`[sendMessage] Conversation not found: ${conversationId}`);
      return res.status(404).json({ error: "Conversation not found." });
    }

    const otherParticipant = conversation.participants.find(
      (p) => p.userId !== senderId
    );

    if (!otherParticipant) {
      console.warn(
        `[sendMessage] No recipient found in conversation ${conversationId} for user ${senderId}`
      );
      return res.status(400).json({ error: "Cannot message yourself." });
    }

    const senderParticipant = conversation.participants.find(
      (p) => p.userId === senderId
    );
    const receiverParticipant = otherParticipant;
    const receiverUser = receiverParticipant.user;

    const receiverNative = receiverUser.nativeLanguage;
    const receiverLearning = receiverUser.learningLanguage;

    let translatedToNative = null;
    let translatedToLearning = null;

    if (text) {
      if (receiverParticipant.chatMode === "COMFORT" && receiverNative) {
        try {
          translatedToNative = await translateText(text, receiverNative);
        } catch (error) {
          console.error(
            `[sendMessage] Translation to native failed for user ${receiverParticipant.userId}:`,
            error
          );
        }
     } else if (
        receiverParticipant.chatMode === "LEARNING" &&
        receiverLearning
      ) {
        try {
          translatedToLearning = await translateText(text, receiverLearning);
        } catch (error) {
          console.error(
            `[sendMessage] Translation to learning failed for user ${receiverParticipant.userId}:`,
            error
          );
        }
     }
    }

    let mediaUrl = null;
    let mediaType = null;

    if (req.file) {
      try {
        const cloudinaryRes = await streamUpload(req.file.buffer);
        mediaUrl = cloudinaryRes.secure_url;
        const mime = req.file.mimetype;
        mediaType = mime.startsWith("image/")
          ? "IMAGE"
          : mime.startsWith("video/")
          ? "VIDEO"
          : "FILE";
      } catch (error) {
        console.error(
          `[sendMessage] Cloudinary upload failed for user ${senderId}:`,
          error
        );
        return res.status(500).json({ error: "Failed to upload media file." });
      }
   }

    const newMessage = await prisma.message.create({
      data: {
        text,
        translatedToNative,
        translatedToLearning,
        mediaUrl,
        mediaType,
        senderId,
        conversationId,
        repliedToId: repliedToId ? Number(repliedToId) : null,
        isCallSystem: false, // ✅ normal messages
        status: "SENT",
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            profilePic: true,
            nativeLanguage: true,
            learningLanguage: true,
          },
        },
      },
    });

    // 📌 Update unread count and fetch updated value in one query
    const updatedReceiverParticipant =
      await prisma.conversationParticipant.update({
        where: {
          userId_conversationId: {
            conversationId,
            userId: receiverParticipant.userId,
          },
        },
        data: { unreadCount: { increment: 1 } },
        select: { unreadCount: true },
      });

    const io = getIOInstance();
    // ✅ Step 4: Emit newMessage event to receiver
    io.to(`conversation_${conversationId}`).emit("newMessage", newMessage);
    const receiverSocketId = getReceiverSocketId(receiverParticipant.userId);
    if (receiverSocketId) {
      // ✅ Step 5: Emit unreadCountUpdated event to receiver for unread bubble update in homepage on friends card
      io.to(receiverSocketId).emit("unreadCountUpdated", {
        conversationId,
        unreadCount: updatedReceiverParticipant.unreadCount,
      });
    }

    console.log(
      `[sendMessage] User ${senderId} sent message ${newMessage.id} in conversation ${conversationId}`
    );

    res.status(201).json(newMessage);
  } catch (error) {
    console.error(`[sendMessage] Internal error:`, error);
    res
      .status(500)
      .json({ error: "Failed to send message. Please try again later." });
 }
};

// -----------------------------
// DELETE MESSAGE
// -----------------------------
export const deleteMessage = async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId, 10);
    const userId = req.user.id;

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return res.status(404).json({ error: "Message not found." });

    // ✅ Prevent deletion of call/system messages
    if (message.isCallSystem) {
      return res
        .status(403)
        .json({ error: "Cannot delete system call messages." });
    }

    if (message.senderId !== userId) {
      console.warn(
        `[deleteMessage] User ${userId} unauthorized to delete message ${messageId}`
      );
      return res
        .status(403)
        .json({ error: "Not authorized to delete this message." });
    }

    await prisma.message.delete({ where: { id: messageId } });

    const io = getIOInstance();
    io.to(`conversation_${message.conversationId}`).emit("messageDeleted", {
      messageId: message.id,
      conversationId: message.conversationId,
    });

    console.log(
      `[deleteMessage] Message ${messageId} permanently deleted by user ${userId}`
    );

    res.status(200).json({
      message: "Message deleted successfully.",
      deletedMessageId: message.id,
    });
 } catch (error) {
    res.status(500).json({ error: "Failed to delete message." });
  }
};

// -----------------------------
// EDIT MESSAGE
// -----------------------------
export const editMessage = async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId, 10);
    const userId = req.user.id;
    const { text } = req.body;

    if (!text) {
      return res
        .status(400)
        .json({ error: "Text is required to edit the message." });
    }

    const existingMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });
    if (!existingMessage) {
      console.warn(`[editMessage] Message not found: ${messageId}`);
      return res.status(404).json({ error: "Message not found." });
    }

    // ✅ Prevent editing system call messages
    if (existingMessage.isCallSystem) {
      return res
        .status(403)
        .json({ error: "Cannot edit system call messages." });
    }

    if (existingMessage.senderId !== userId) {
      console.warn(
        `[editMessage] Unauthorized edit attempt by user ${userId} on message ${messageId}`
      );
      return res
        .status(403)
        .json({ error: "Not authorized to edit this message." });
    }

    let translatedToNative = null;
    let translatedToLearning = null;

    const participants = existingMessage.conversation.participants;

    for (const participant of participants) {
      if (participant.userId !== userId) {
        const mode = participant.chatMode;
        const targetLang =
          mode === "COMFORT"
            ? participant.user.nativeLanguage
            : mode === "LEARNING"
            ? participant.user.learningLanguage
            : null;

        if (targetLang && text) {
          try {
            const translated = await translateText(text, targetLang);
            if (mode === "COMFORT") translatedToNative = translated;
            if (mode === "LEARNING") translatedToLearning = translated;
          } catch (translateErr) {
            console.error(
              `[editMessage] Translation failed for user ${participant.userId}:`,
              translateErr
            );
          }
        }
      }
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        text,
        translatedToNative,
        translatedToLearning,
        edited: true,
      },
   });

    const io = getIOInstance();
    io.to(`conversation_${existingMessage.conversationId}`).emit(
      "messageEdited",
      {
        messageId: updatedMessage.id,
        conversationId: existingMessage.conversationId,
        text: updatedMessage.text,
        translatedToNative: updatedMessage.translatedToNative,
        translatedToLearning: updatedMessage.translatedToLearning,
        edited: updatedMessage.edited,
        updatedAt: updatedMessage.updatedAt,
      }
    );

    console.log(`[editMessage] Message ${messageId} edited by user ${userId}`);
    res.status(200).json(updatedMessage);
  } catch (error) {
    console.error(`[editMessage] Internal error:`, error);
    res
      .status(500)
      .json({ error: "Failed to edit message. Please try again later." });
 }
};

// -----------------------------
// TOGGLE REACTION ON MESSAGE
// -----------------------------
export const toggleReactionOnMessage = async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId, 10);
    const userId = req.user.id;
    const { emoji } = req.body;

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return res.status(404).json({ error: "Message not found." });

    // ✅ Prevent reactions on system call messages
    if (message.isCallSystem) {
      return res
        .status(403)
        .json({ error: "Cannot react to system call messages." });
    }

    let existingReaction = await prisma.reaction.findFirst({
      where: { messageId, userId },
      include: { message: { select: { conversationId: true } } },
    });

    const io = getIOInstance();
    if (existingReaction) {
      if (existingReaction.emoji === emoji) {
        await prisma.reaction.delete({ where: { id: existingReaction.id } });
        io.to(`conversation_${existingReaction.message.conversationId}`).emit(
          "reactionDeleted",
          { messageId, userId }
        );
        return res.status(200).json({ message: "Reaction deleted" });
      } else {
        // Different emoji — update existing reaction
        const updatedReaction = await prisma.reaction.update({
          where: { id: existingReaction.id },
          data: { emoji },
        });
        io.to(`conversation_${existingReaction.message.conversationId}`).emit(
          "messageReaction",
          { messageId, reaction: updatedReaction }
        );
        return res.status(200).json(updatedReaction);
      }
    } else {
      // No reaction yet — create new one
      const newReaction = await prisma.reaction.create({
        data: { emoji, userId, messageId },
      });
      io.to(`conversation_${message.conversationId}`).emit("messageReaction", {
        messageId,
        reaction: newReaction,
      });
      return res.status(200).json(newReaction);
    }
  } catch (error) {
    console.error("[toggleReactionOnMessage] Error:", error);
    res.status(500).json({ error: "Failed to toggle reaction." });
  }
};
