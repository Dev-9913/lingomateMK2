import { Server } from "socket.io";
import prisma from "../lib/db.js";
import {
  startCall,
  acceptCall,
  rejectCall,
  endCall,
  markMissedCall,
} from "../controller/call.service.js";

const userSocketMap = {}; // { userId: socketId }

// =======================
// ONLINE USER HELPERS
// =======================
/**
 * Get the socketId for a user
 */

export const getReceiverSocketId = (userId) => {
  return userSocketMap[userId];
};
/**
 * Return an array of currently online user IDs
 */
export const getOnlineUsers = () => {
  return Object.keys(userSocketMap).map((id) => parseInt(id, 10));
};

// =======================
// SOCKET INITIALIZATION
// =======================

let ioInstance = null;

export const initSocket = (server, allowedOrigins) => {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  ioInstance = io;

  io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);

    // coerce the incoming query param to a number
    const rawId = socket.handshake.query.userId;
    console.log("User ID from handshake:", rawId);

    const userId = rawId ? parseInt(rawId, 10) : null;

    console.log("User ID from handshake:", rawId);
    console.log("Parsed userId:", userId);

    if (userId) {
      userSocketMap[userId] = socket.id;

      // ✅ Emit user's online status
      io.emit("userOnlineStatusChanged", {
        userId,
        isOnline: true,
      });

      io.emit("onlineUsers", getOnlineUsers());
    }

    // =======================
    // JOIN CONVERSATION
    // =======================

    socket.on("joinConversation", ({ conversationId }) => {
      socket.join(`conversation_${conversationId}`);
      console.log(`User ${userId} joined conversation_${conversationId}`);
    });

    // =======================
    // MESSAGE DELIVERY
    // =======================

    socket.on("message_delivered", async ({ messageId, conversationId }) => {
      try {
        // 1) Mark message in DB as DELIVERED
        const updated = await prisma.message.update({
          where: { id: messageId },
          data: { status: "DELIVERED" },
          select: { id: true, senderId: true },
        });

        // 2) Notify the original sender
        const senderSocketId = getReceiverSocketId(updated.senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("message_delivered", {
            messageId: updated.id,
            conversationId,
          });
        }
      } catch (err) {
        console.error("message_delivered error:", err);
      }
    });

    // =======================
    // TYPING INDICATOR
    // =======================

    socket.on("typing", ({ conversationId, isTyping }) => {
      socket
        .to(`conversation_${conversationId}`)
        .emit("typing", { userId, isTyping });
    });

    // =======================
    // VIDEO CALL EVENTS
    // =======================

    // Caller initiates call
    socket.on("call-user", async ({ conversationId, receiverId }) => {
      console.log(
        `📞 call-user → from ${userId} to ${receiverId} (conversation ${conversationId})`
      );
      try {
        await startCall({ callerId: userId, conversationId, receiverId });
      } catch (err) {
        console.error("❌ call-user error:", err);
      }
    });

    // Receiver accepts the call
    socket.on("accept-call", async ({ callId }) => {
      console.log(`✅ accept-call → by user ${userId} for call ${callId}`);
      try {
        if (!callId) return console.warn("⚠️ Missing callId on accept-call");
        await acceptCall({ callId, userId });
      } catch (err) {
        console.error("❌ accept-call error:", err);
      }
    });

    // Receiver rejects the call
    socket.on("reject-call", async ({ callId }) => {
      console.log(`🚫 reject-call → by user ${userId} for call ${callId}`);
      try {
        if (!callId) return console.warn("⚠️ Missing callId on reject-call");
        await rejectCall({ callId, userId });
      } catch (err) {
        console.error("❌ reject-call error:", err);
      }
    });

    // Either party ends the call
    socket.on("end-call", async ({ callId }) => {
      console.log(`🔚 end-call → by user ${userId} for call ${callId}`);
      try {
        if (!callId) return console.warn("⚠️ Missing callId on end-call");
        await endCall({ callId, userId });
      } catch (err) {
        console.error("❌ end-call error:", err);
      }
    });

    // =======================
    // WEBRTC SIGNALING
    // =======================

    socket.on("webrtc-offer", ({ receiverId, sdp }) => {
      console.log(`📤 webrtc-offer → from ${userId} to ${receiverId}`);
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        console.log(`   ↳ delivering offer to socket ${receiverSocketId}`);
        io.to(receiverSocketId).emit("webrtc-offer", { sdp, senderId: userId });
      } else {
        console.warn(`⚠️ Receiver ${receiverId} not online for offer`);
      }
    });

    socket.on("webrtc-answer", ({ receiverId, sdp }) => {
      console.log(`📤 webrtc-answer → from ${userId} to ${receiverId}`);
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        console.log(`   ↳ delivering answer to socket ${receiverSocketId}`);
        io.to(receiverSocketId).emit("webrtc-answer", {
          sdp,
          senderId: userId,
        });
      } else {
        console.warn(`⚠️ Receiver ${receiverId} not online for answer`);
      }
    });

    socket.on("webrtc-ice-candidate", ({ receiverId, candidate }) => {
      console.log(`📤 webrtc-ice-candidate → from ${userId} to ${receiverId}`);
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("webrtc-ice-candidate", {
          candidate,
          senderId: userId,
        });
      } else {
        console.warn(`⚠️ Receiver ${receiverId} not online for candidate`);
      }
    });

    // =======================
    // DISCONNECT HANDLER
    // =======================

    socket.on("disconnect", async () => {
      console.log("❌ Disconnected:", socket.id);

      delete userSocketMap[userId];
      io.emit("onlineUsers", getOnlineUsers());

      if (userId) {
        // ✅ Emit user offline
        io.emit("userOnlineStatusChanged", {
          userId: parseInt(userId, 10),
          isOnline: false,
        });

        const lastSeen = new Date();

        try {
          await prisma.user.update({
            where: { id: parseInt(userId, 10) },
            data: { lastSeen },
          });

          // ✅ Emit last seen update
          io.emit("userLastSeenUpdate", {
            userId: parseInt(userId, 10),
            lastSeen: lastSeen.toISOString(),
          });
        } catch (error) {
          console.error("Failed to update lastSeen for user:", userId, error);
        }

        // END any active calls of disconnected user
        try {
          const activeCalls = await prisma.call.findMany({
            where: {
              OR: [{ callerId: userId }, { receiverId: userId }],
              status: "RINGING",
            },
          });

          for (const c of activeCalls) {
            await markMissedCall({
              callId: c.id,
              receiverId: c.receiverId,
            });
          }
        } catch (err) {
          console.error("disconnect call cleanup:", err);
        }
      }
    });
  });

  // Store IO instance globally for use inside services
  setIOInstance(io);
  return io;
};

// global IO instance setters/getters

export const setIOInstance = (io) => {
  ioInstance = io;
};

export const getIOInstance = () => ioInstance;
