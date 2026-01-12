// src/components/chat/ChatContainer.jsx
import React, { forwardRef } from "react";
import MessageBubble from "./MessageBubble";
import { format } from "date-fns";

const ChatContainer = forwardRef(function ChatContainer(
  {
    messages,
    currentUserId,
    otherUser,
    isTyping,
    lastReadMessageId,
    lastDeliveredMessageId,
    onReaction,
    onReply,
    onEdit,
    onDelete,
    onShowInfo,
    onOpenEmojiPicker,
    editingMessage,
    onSaveEdit,
    onCancelEdit,
  },
  ref // this is your containerRef
) {
  // group by calendar date
  const grouped = messages.reduce((acc, msg) => {
    const d = new Date(msg.createdAt).toDateString();
    acc[d] = acc[d] || [];
    acc[d].push(msg);
    return acc;
  }, {});

  return (
    <div ref={ref} className="flex-1 overflow-y-auto px-4 py-2">
      {Object.entries(grouped).map(([date, dayMessages]) => (
        <div key={date}>
          <div className="text-center text-sm text-gray-400 my-4">
            {format(new Date(date), "MMMM dd, yyyy")}
          </div>
          {dayMessages.map((message) => {
            // use message.sender.id (the real field)
            const isOwn = message.sender.id === currentUserId;

            // divider before first unread from them
            const showDivider = message.id === lastReadMessageId && !isOwn;

            // find the full message object you’re replying to (if any)
            const replyTo =
              message.repliedToId != null
                ? messages.find((m) => m.id === message.repliedToId)
                : null;

            // disable callbacks for system messages
            const isSystem = message.isSystem === true;

            return (
              <div
                key={message.id}
                data-message-id={message.id} // for initial scroll
              >
                {showDivider && (
                  <div className="text-center my-4 text-xs text-purple-500 font-semibold">
                    Unread Messages
                  </div>
                )}
                <MessageBubble
                  message={message}
                  isOwn={isOwn}
                  sender={!isOwn ? otherUser : undefined}
                  replyTo={replyTo}
                  reactions={message.reactions || []}
                  currentUserId={currentUserId}
                  isEditing={editingMessage?.id === message.id}
                  onReaction={isSystem ? null : (emoji) => onReaction(message.id, emoji)}
                  onReply={isSystem ? null : () => onReply(message)}
                  onEdit={isSystem ? null : () => onEdit(message)}
                  onDelete={isSystem ? null : () => onDelete(message.id)}
                  onShowInfo={isSystem ? null : () => onShowInfo(message)}
                  onOpenEmojiPicker={isSystem ? null : () => onOpenEmojiPicker(message.id)}
                  onSaveEdit={onSaveEdit}
                  onCancelEdit={onCancelEdit}
                />
              </div>
            );
          })}
        </div>
      ))}

      {isTyping && (
        <div className="flex justify-start px-2 mt-2">
          <div className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-xl text-sm max-w-xs animate-pulse">
            {otherUser?.fullName || "User"} is typing...
          </div>
        </div>
      )}

      {/* show Sent/Delivered/Read status on the very last message */}
      {messages.length > 0 && (
        <div className="flex justify-end mb-6">
          <span className="text-xs text-gray-400">
            {(() => {
              const last = messages[messages.length - 1];
              if (last.sender.id !== currentUserId) return null;
              if (last.id === lastReadMessageId) {
                return `Read ${format(new Date(last.createdAt), "HH:mm")}`;
              } else if (
                lastDeliveredMessageId &&
                last.id === lastDeliveredMessageId
              ) {
                return `Delivered ${format(new Date(last.createdAt), "HH:mm")}`;
              } else {
                return `Sent ${format(new Date(last.createdAt), "HH:mm")}`;
              }
            })()}
          </span>
        </div>
      )}
    </div>
  );
});

export default ChatContainer;
