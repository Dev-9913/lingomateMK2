import prisma from "../lib/db.js";
import { getIOInstance, getReceiverSocketId } from "../lib/socket.js";

const callTimeouts = new Map();

const createAndEmitSystemMessage = async ({ conversationId, senderId, text }) => {
  const msg = await prisma.message.create({
    data: {
      conversationId: Number(conversationId), // Ensure this is also a number
      senderId: Number(senderId),
      text,
      isCallSystem: true,
      status: "SENT",
    },
    include: {
      sender: { select: { id: true, fullName: true, profilePic: true } },
      reactions: true,
    },
  });

  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId: Number(conversationId) },
  });

  const otherParticipants = participants.filter((p) => p.userId !== senderId);

  for (const p of otherParticipants) {
    await prisma.conversationParticipant.update({
      where: { userId_conversationId: { userId: p.userId, conversationId: Number(conversationId) } },
      data: { unreadCount: { increment: 1 } },
    });
  }

  const io = getIOInstance();
  io.to(`conversation_${conversationId}`).emit("newMessage", msg);

  for (const p of otherParticipants) {
    const sock = getReceiverSocketId(p.userId);
    if (sock) {
      const fresh = await prisma.conversationParticipant.findUnique({
        where: { userId_conversationId: { userId: p.userId, conversationId: Number(conversationId) } },
        select: { unreadCount: true },
      });
      io.to(sock).emit("unreadCountUpdated", {
        conversationId,
        unreadCount: fresh.unreadCount,
      });
    }
  }

  return msg;
};

/* ============================================================
   1) Start Call — create RINGING call + emit incoming/outgoing
   ============================================================ */
export const startCall = async ({ callerId, conversationId, receiverId }) => {
  const convId = Number(conversationId);
  if (isNaN(convId)) throw new Error("Invalid conversationId");

  const newCall = await prisma.call.create({
    data: {
      conversationId: convId,
      callerId: Number(callerId),
      receiverId: Number(receiverId),
      status: "RINGING",
    },
  });

  await createAndEmitSystemMessage({
    conversationId: convId,
    senderId: callerId,
    text: "Calling...",
  });

  const io = getIOInstance();
  const receiverSocket = getReceiverSocketId(receiverId);
  const callerSocket = getReceiverSocketId(callerId);

  const caller = await prisma.user.findUnique({ where: { id: callerId } });
  const receiver = await prisma.user.findUnique({ where: { id: receiverId } });

  if (receiverSocket) {
    io.to(receiverSocket).emit("incomingCall", {
      callId: newCall.id,
      callerId,
      callerName: caller.fullName,
      conversationId: convId,
      status: "RINGING",
    });
  }

  if (callerSocket) {
    io.to(callerSocket).emit("outgoingCall", {
      callId: newCall.id,
      receiverId,
      receiverName: receiver.fullName,
      conversationId: convId,
      status: "RINGING",
    });
  }

  const t = setTimeout(async () => {
    try {
      const current = await prisma.call.findUnique({ where: { id: newCall.id } });
      if (current && current.status === "RINGING") {
        await markMissedCall({ callId: current.id, receiverId });
      }
    } catch (err) {
      console.error("[startCall] missed-call timer error:", err);
    } finally {
      callTimeouts.delete(newCall.id);
    }
  }, 30_000);

  callTimeouts.set(newCall.id, t);
  return newCall;
};

/* ============================================================
   Helper: clear call timeout if present
   ============================================================ */
const clearCallTimeoutIfExists = (callId) => {
  if (!callId) return;
  const numericCallId = Number(callId);
  if (callTimeouts.has(numericCallId)) {
    try {
      clearTimeout(callTimeouts.get(numericCallId));
    } catch (err) {}
    callTimeouts.delete(numericCallId);
  }
};

/* ============================================================
   2) Accept Call
   ============================================================ */
export const acceptCall = async ({ callId, userId }) => {
  if (!callId) return null;
  // ✅ FIX: Convert callId to a number before querying Prisma
  const numericCallId = Number(callId);
  if (isNaN(numericCallId)) return null;

  const call = await prisma.call.findUnique({ where: { id: numericCallId } });
  if (!call || call.status !== "RINGING") return null;

  clearCallTimeoutIfExists(numericCallId);

  const updated = await prisma.call.update({
    where: { id: numericCallId },
    data: { status: "ONGOING", startedAt: new Date() },
  });

  await createAndEmitSystemMessage({
    conversationId: call.conversationId,
    senderId: userId,
    text: "Accepted the call",
  });

  const io = getIOInstance();
  const callerSocket = getReceiverSocketId(call.callerId);
  const receiverSocket = getReceiverSocketId(call.receiverId);

  const payload = {
    callId: call.id,
    conversationId: call.conversationId,
    callerId: call.callerId,
    receiverId: call.receiverId,
    status: "ONGOING",
    startedAt: updated.startedAt,
  };

  if (callerSocket) io.to(callerSocket).emit("callAccepted", payload);
  if (receiverSocket) io.to(receiverSocket).emit("callAccepted", payload);

  return updated;
};

/* ============================================================
   3) Reject Call
   ============================================================ */
export const rejectCall = async ({ callId, userId }) => {
  if (!callId) return null;
  // ✅ FIX: Convert callId to a number before querying Prisma
  const numericCallId = Number(callId);
  if (isNaN(numericCallId)) return null;

  const call = await prisma.call.findUnique({ where: { id: numericCallId } });
  if (!call || call.status !== "RINGING") return null;

  clearCallTimeoutIfExists(numericCallId);

  const updated = await prisma.call.update({
    where: { id: numericCallId },
    data: { status: "REJECTED", endedAt: new Date(), duration: 0 },
  });

  await createAndEmitSystemMessage({
    conversationId: call.conversationId,
    senderId: userId,
    text: "Rejected the call",
  });

  const io = getIOInstance();
  const callerSocket = getReceiverSocketId(call.callerId);
  const receiverSocket = getReceiverSocketId(call.receiverId);

  const payload = {
    callId: call.id,
    conversationId: call.conversationId,
    callerId: call.callerId,
    receiverId: call.receiverId,
    status: "REJECTED",
  };

  if (callerSocket) io.to(callerSocket).emit("callRejected", payload);
  if (receiverSocket) io.to(receiverSocket).emit("callRejected", payload);

  return updated;
};

/* ============================================================
   4) End Call
   ============================================================ */
export const endCall = async ({ callId, userId }) => {
  if (!callId) throw new Error("Missing callId");
  // ✅ FIX: Convert callId to a number before querying Prisma
  const numericCallId = Number(callId);
  if (isNaN(numericCallId)) throw new Error("Invalid callId provided");

  const call = await prisma.call.findUnique({ where: { id: numericCallId } });
  if (!call) throw new Error(`Call with ID ${numericCallId} not found`);

  clearCallTimeoutIfExists(numericCallId);

  const durationSec = call.startedAt
    ? Math.floor((Date.now() - call.startedAt.getTime()) / 1000)
    : 0;

  const updatedCall = await prisma.call.update({
    where: { id: numericCallId },
    data: { status: "ENDED", endedAt: new Date(), duration: durationSec },
  });

  await createAndEmitSystemMessage({
    conversationId: call.conversationId,
    senderId: userId,
    text: `Ended the call (${durationSec}s)`,
  });

  const io = getIOInstance();
  const callerSocket = getReceiverSocketId(call.callerId);
  const receiverSocket = getReceiverSocketId(call.receiverId);

  const payload = {
    callId: call.id,
    conversationId: call.conversationId,
    endedBy: userId,
    duration: durationSec,
    status: "ENDED",
  };

  if (callerSocket) io.to(callerSocket).emit("callEnded", payload);
  if (receiverSocket) io.to(receiverSocket).emit("callEnded", payload);

  return updatedCall;
};

/* ============================================================
   5) Missed Call
   ============================================================ */
export const markMissedCall = async ({ callId, receiverId }) => {
  if (!callId) return null;
  // ✅ FIX: Convert callId to a number before querying Prisma
  const numericCallId = Number(callId);
  if (isNaN(numericCallId)) return null;
  
  const call = await prisma.call.findUnique({ where: { id: numericCallId } });
  if (!call || call.status !== "RINGING") return null;

  clearCallTimeoutIfExists(numericCallId);

  const updated = await prisma.call.update({
    where: { id: numericCallId },
    data: { status: "MISSED", endedAt: new Date(), duration: 0 },
  });

  await createAndEmitSystemMessage({
    conversationId: call.conversationId,
    senderId: call.callerId,
    text: "Missed call",
  });

  const io = getIOInstance();
  const callerSocket = getReceiverSocketId(call.callerId);
  const receiverSocket = getReceiverSocketId(call.receiverId);

  const payload = {
    callId: call.id,
    conversationId: call.conversationId,
    callerId: call.callerId,
    receiverId: call.receiverId,
    status: "MISSED",
  };

  if (callerSocket) io.to(callerSocket).emit("callMissed", payload);
  if (receiverSocket) io.to(receiverSocket).emit("callMissed", payload);

  return updated;
};