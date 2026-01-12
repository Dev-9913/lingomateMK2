import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import useAuthUser from "../hooks/useAuthUser";
import { useSocket } from "../hooks/useSocket";
import { usePresence } from "../hooks/usePresence";
import {
  useConversation,
  useMessages,
  useSendMessage,
  useEditMessage,
  useDeleteMessage,
  useToggleReaction,
  useUpdateChatMode,
} from "../hooks/useChat";

import ChatHeader from "../components/chat/ChatHeader";
import ChatContainer from "../components/chat/ChatContainer";
import MessageInput from "../components/chat/MessageInput";
import MessageInfoModal from "../components/chat/MessageInfoModal";
import EmojiPicker from "emoji-picker-react";

export default function ChatPage() {
  const { authUser } = useAuthUser();
  const { socket } = useSocket({ user: authUser });
  const { onlineUsers, lastSeenMap } = usePresence();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: convo, isLoading: convoLoading } = useConversation(conversationId);
  const {
    data,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(conversationId);

  const messages =
    data?.pages
      .slice()
      .reverse()
      .flatMap((page) => page.messages) || [];

  const sendMessageMutation = useSendMessage();
  const editMessageMutation = useEditMessage();
  const deleteMessageMutation = useDeleteMessage();
  const toggleReactionMutation = useToggleReaction();
  const updateChatModeMutation = useUpdateChatMode();

  const [chatMode, setChatMode] = useState("BRIDGE");
  const [localTyping, setLocalTyping] = useState(false);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedForEmoji, setSelectedForEmoji] = useState(null);
  const [selectedForInfo, setSelectedForInfo] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  const [incomingCall, setIncomingCall] = useState(null);
  const [outgoingCall, setOutgoingCall] = useState(null);

  const meParticipant = convo?.participants.find((p) => p.user.id === authUser.id);
  const otherParticipant = convo?.participants.find((p) => p.user.id !== authUser.id);
  const otherUser = otherParticipant?.user || null;

  useEffect(() => {
    if (meParticipant) setChatMode(meParticipant.chatMode);
  }, [meParticipant]);

  const [lastReadMessageId, setLastReadMessageId] = useState(null);
  useEffect(() => {
    if (meParticipant?.lastReadMessageId)
      setLastReadMessageId(meParticipant.lastReadMessageId);
  }, [meParticipant]);

  const lastDeliveredMessageId = (() => {
    const delivered = messages.filter((m) => m.status === "DELIVERED");
    return delivered.length ? delivered[delivered.length - 1].id : null;
  })();

  useEffect(() => {
    if (socket && conversationId) {
      socket.emit("joinConversation", { conversationId });
      return () => socket.emit("leaveConversation", { conversationId });
    }
  }, [socket, conversationId]);

  const navigateSafe = (to) => {
    if (incomingCall || outgoingCall) {
      toast.error("Cannot exit during a call");
      return;
    }
    navigate(to);
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (incomingCall || outgoingCall) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [incomingCall, outgoingCall]);

  useEffect(() => {
    if (!socket || !conversationId) return;
    const key = ["messages", conversationId];

    const appendToLastPage = (updater) => {
      queryClient.setQueryData(key, (oldData) => {
        if (!oldData) return oldData;
        const newPages = [...oldData.pages];
        const lastPage = newPages[newPages.length - 1];
        newPages[newPages.length - 1] = { ...lastPage, messages: updater(lastPage.messages) };
        return { ...oldData, pages: newPages };
      });
    };

    const updateAllPages = (updater) => {
      queryClient.setQueryData(key, (oldData) => {
        if (!oldData) return oldData;
        const newPages = oldData.pages.map((page) => ({ ...page, messages: updater(page.messages) }));
        return { ...oldData, pages: newPages };
      });
    };

    const onNew = (msg) => {
      const isOwn = Number(msg.senderId) === authUser.id;
      let displayed = msg.text;
      if (!isOwn) {
        if (chatMode === "COMFORT" && msg.translatedToNative) displayed = msg.translatedToNative;
        else if (chatMode === "LEARNING" && msg.translatedToLearning) displayed = msg.translatedToLearning;
      }
      appendToLastPage((msgs) => [...msgs, { ...msg, text: displayed }]);
      socket.emit("message_delivered", { messageId: msg.id, conversationId });
    };

    const onDelivered = ({ messageId }) =>
      updateAllPages((msgs) => msgs.map((m) => (m.id === messageId ? { ...m, status: "DELIVERED" } : m)));

    const onMessageRead = ({ messageId }) =>
      updateAllPages((msgs) => msgs.map((m) => (m.id === messageId ? { ...m, status: "READ" } : m)));

    const onEdit = (data) =>
      updateAllPages((msgs) => msgs.map((m) => (m.id === data.messageId ? { ...m, ...data } : m)));

    const onDelete = ({ messageId }) =>
      updateAllPages((msgs) => msgs.filter((m) => m.id !== messageId));

    const onReact = ({ messageId, reaction }) =>
      updateAllPages((msgs) =>
        msgs.map((m) =>
          m.id === messageId
            ? { ...m, reactions: [...(m.reactions || []).filter((r) => r.userId !== reaction.userId), reaction] }
            : m
        )
      );

    const onReactionDeleted = ({ messageId, userId }) =>
      updateAllPages((msgs) =>
        msgs.map((m) =>
          m.id === messageId
            ? { ...m, reactions: (m.reactions || []).filter((r) => r.userId !== userId) }
            : m
        )
      );

    const onTypingEvent = ({ userId, isTyping }) => {
      if (Number(userId) !== Number(authUser.id)) setRemoteTyping(isTyping);
    };

    const onConversationRead = ({ readerId }) => {
      if (readerId === authUser.id) {
        const data = queryClient.getQueryData(key);
        const last = data?.pages?.flatMap((p) => p.messages).pop();
        if (last) setLastReadMessageId(last.id);
      }
    };

    // --- Call Event Handlers ---
    const handleIncomingCall = (callData) => setIncomingCall(callData);
    const handleOutgoingCall = (callData) => setOutgoingCall(callData);

    const handleCallAccepted = (callData) => {
      // ✅ FIX: Determine if this user is the caller to correctly set the peerId
      const isCaller = outgoingCall?.callId === callData.callId;
      const peerId = isCaller ? callData.receiverId : callData.callerId;
      setIncomingCall(null);
      setOutgoingCall(null);

      // ✅ FIX: Open call in a new tab with URL parameters
      const url = `/call/${callData.conversationId}?callId=${callData.callId}&peerId=${peerId}&isCaller=${isCaller}`;
      window.open(url, "_blank");
    };

    const handleCallRejected = () => {
      setOutgoingCall(null);
      setIncomingCall(null);
      toast.error("Call was rejected");
    };
    
    const handleCallEnded = () => {
      setOutgoingCall(null);
      setIncomingCall(null);
      toast("Call ended");
    };
    
    const handleCallMissed = () => {
      setOutgoingCall(null);
      setIncomingCall(null);
      toast("Missed call");
    };

    socket.on("newMessage", onNew);
    socket.on("message_delivered", onDelivered);
    socket.on("message_read", onMessageRead);
    socket.on("conversationRead", onConversationRead);
    socket.on("messageEdited", onEdit);
    socket.on("messageDeleted", onDelete);
    socket.on("messageReaction", onReact);
    socket.on("reactionDeleted", onReactionDeleted);
    socket.on("typing", onTypingEvent);
    socket.on("incomingCall", handleIncomingCall);
    socket.on("outgoingCall", handleOutgoingCall);
    socket.on("callAccepted", handleCallAccepted);
    socket.on("callRejected", handleCallRejected);
    socket.on("callEnded", handleCallEnded);
    socket.on("callMissed", handleCallMissed);

    return () => {
      socket.off("newMessage", onNew);
      socket.off("message_delivered", onDelivered);
      socket.off("message_read", onMessageRead);
      socket.off("conversationRead", onConversationRead);
      socket.off("messageEdited", onEdit);
      socket.off("messageDeleted", onDelete);
      socket.off("messageReaction", onReact);
      socket.off("reactionDeleted", onReactionDeleted);
      socket.off("typing", onTypingEvent);
      socket.off("incomingCall", handleIncomingCall);
      socket.off("outgoingCall", handleOutgoingCall);
      socket.off("callAccepted", handleCallAccepted);
      socket.off("callRejected", handleCallRejected);
      socket.off("callEnded", handleCallEnded);
      socket.off("callMissed", handleCallMissed);
    };
  }, [socket, conversationId, authUser.id, queryClient, chatMode, navigate, outgoingCall]);

  const containerRef = useRef();
  const [initialScrollDone, setInitialScrollDone] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop < 50 && hasNextPage && !isFetchingNextPage) fetchNextPage();
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (initialScrollDone || !messages.length) return;
    const el = containerRef.current;
    if (!el) return;
    const anchor = lastReadMessageId ? el.querySelector(`[data-message-id="${lastReadMessageId}"]`) : null;
    el.scrollTop = anchor ? anchor.offsetTop : el.scrollHeight;
    setInitialScrollDone(true);
  }, [messages, lastReadMessageId, initialScrollDone]);

  useEffect(() => {
    if (!remoteTyping) return;
    const t = setTimeout(() => setRemoteTyping(false), 3000);
    return () => clearTimeout(t);
  }, [remoteTyping]);

  const handleSend = async ({ text, media }) => {
    try {
      await sendMessageMutation.mutateAsync({ conversationId, text, media, repliedToId: replyingTo?.id });
      setReplyingTo(null);
      setLocalTyping(false);
      socket.emit("typing", { conversationId, isTyping: false });
    } catch {
      toast.error("Failed to send message");
    }
  };

  const handleTyping = (isNowTyping) => {
    setLocalTyping(isNowTyping);
    socket.emit("typing", { conversationId, isTyping: isNowTyping });
  };

  const handleEdit = (msg) => setEditingMessage(msg);
  const handleSaveEdit = async (id, newText) => {
    console.log("Saving edit:", id, newText);
    try {
      await editMessageMutation.mutateAsync({ messageId: id, newContent: newText });
      setEditingMessage(null);
    } catch {
      toast.error("Failed to edit");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete message?")) return;
    try {
      await deleteMessageMutation.mutateAsync({ messageId: id });
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleReact = async (messageId, emoji) => {
    try {
      await toggleReactionMutation.mutateAsync({ conversationId, messageId, emoji });
    } catch {
      toast.error("Failed to react");
    }
  };

  const handleModeChange = async (mode) => {
    try {
      await updateChatModeMutation.mutateAsync({ conversationId, chatMode: mode });
      setChatMode(mode);
    } catch {
      toast.error("Failed to change mode");
    }
  };

  const shapedMessages = messages.map((m) =>
    m.isCallSystem ? { ...m, isSystem: true } : m
  );

  if (convoLoading || messagesLoading)
    return (
      <div className="h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );

  if (!otherUser)
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Conversation not found.</p>
      </div>
    );

  return (
    <div className="h-screen flex flex-col">
      <ChatHeader
        participant={otherUser}
        isOnline={onlineUsers.includes(otherUser.id)}
        lastSeen={lastSeenMap[otherUser.id]}
        chatMode={chatMode}
        onChatModeChange={handleModeChange}
        onVideoCall={() => {
          socket.emit("call-user", {
            conversationId: Number(conversationId),
            receiverId: otherUser.id,
          });
        }}
        disableExit={!!incomingCall || !!outgoingCall}
        navigateSafe={navigateSafe}
      />
      {isFetchingNextPage && (
        <div className="absolute top-0 w-full flex justify-center p-2">
          <span className="loading loading-spinner loading-sm" />
        </div>
      )}

      <ChatContainer
        ref={containerRef}
        messages={shapedMessages}
        currentUserId={authUser.id}
        otherUser={otherUser}
        isTyping={remoteTyping}
        lastReadMessageId={lastReadMessageId}
        lastDeliveredMessageId={lastDeliveredMessageId}
        onReaction={handleReact}
        onReply={setReplyingTo}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onShowInfo={setSelectedForInfo}
        onOpenEmojiPicker={(id) => {
          setSelectedForEmoji(id);
          setShowEmojiPicker(true);
        }}
        editingMessage={editingMessage}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={() => setEditingMessage(null)}
      />

      <MessageInput
        onSend={handleSend}
        onTyping={handleTyping}
        onOpenEmojiPicker={() => setShowEmojiPicker(true)}
        isTyping={localTyping}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />

      {showEmojiPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-2">
            <EmojiPicker
              onEmojiClick={(emojiData) => {
                handleReact(selectedForEmoji, emojiData.emoji);
                setShowEmojiPicker(false);
                setSelectedForEmoji(null);
              }}
            />
            <button
              onClick={() => {
                setShowEmojiPicker(false);
                setSelectedForEmoji(null);
              }}
              className="btn btn-outline mt-2 w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <MessageInfoModal
        isOpen={!!selectedForInfo}
        message={selectedForInfo}
        onClose={() => setSelectedForInfo(null)}
      />

      {/* Outgoing call popup */}
      {outgoingCall && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded p-4 z-50">
          <p>Calling {otherUser.fullName}...</p>
          <button
            className="btn btn-error btn-sm mt-2"
            onClick={() => {
              // ✅ FIX: Send the correct callId
              socket.emit("end-call", { callId: outgoingCall.callId });
              setOutgoingCall(null);
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Incoming call popup */}
      {incomingCall && (
        <div className="fixed bottom-4 left-4 bg-white shadow-lg rounded p-4 z-50">
          <p>{incomingCall.callerName} is calling...</p>
          <div className="flex space-x-2 mt-2">
            <button
              className="btn btn-success btn-sm"
              onClick={() =>
                // ✅ FIX: Send the correct callId
                socket.emit("accept-call", { callId: incomingCall.callId })
              }
            >
              Accept
            </button>
            <button
              className="btn btn-error btn-sm"
              onClick={() =>
                // ✅ FIX: Send the correct callId
                socket.emit("reject-call", { callId: incomingCall.callId })
              }
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}