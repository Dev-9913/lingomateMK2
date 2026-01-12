import { useState, useEffect, useRef } from "react";
import {
  Reply,
  Edit,
  Copy,
  Smile,
  Info,
  Trash2,
  MoreVertical,
  Video, 
  FileText,
} from "lucide-react";

export default function MessageBubble({
  message,
  isOwn,
  sender,
  replyTo,
  isEditing,
  onSaveEdit,
  onCancelEdit,
  currentUserId,
  onReaction, // (emoji) => void, already bound to message.id
  onReply,
  onEdit,
  onDelete,
  onShowInfo,
  onOpenEmojiPicker,
}) {
  const [showActions, setShowActions] = useState(false);
  const [draftText, setDraftText] = useState(message.text || "");
  const menuRef = useRef(null);
  const bubbleRef = useRef(null);

  const isSystem = message.isSystem === true;

  // Close menu on outside click
  useEffect(() => {
    if (!showActions) return;
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowActions(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showActions]);

  // Clipboard helper
  const copyToClipboard = () => {
    const txt = message.text || "";
    if (navigator.clipboard) navigator.clipboard.writeText(txt);
    else {
      const ta = document.createElement("textarea");
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  // Time formatter
  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  // 1) Build counts per emoji
  const reactionCounts = (message.reactions || []).reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  // 2) Which emojis have *you* added?
  const myEmojis = new Set(
    (message.reactions || [])
      .filter((r) => r.userId === currentUserId)
      .map((r) => r.emoji)
  );

  // Status ticks
  const statusIcon = () => {
    if (!isOwn) return null;
    switch (message.status) {
      case "READ":
        return <span className="text-blue-500">✓✓</span>;
      case "DELIVERED":
        return <span>✓✓</span>;
      default:
        return <span>✓</span>;
    }
  };

  // ── SYSTEM MESSAGE (Call info) ──
  if (isSystem) {
    return (
      <div
        className={`mb-6 flex ${isOwn ? "justify-end" : "justify-start"}`}
        ref={bubbleRef}
      >
        <div
          className={`px-4 py-2 rounded-2xl text-sm flex items-center gap-2 ${
            isOwn
              ? "bg-purple-600 text-white rounded-br-md"
              : "bg-purple-100 text-purple-900 rounded-bl-md"
          }`}
        >
          <Video className="w-4 h-4" />
          <span>{message.text || "Video call information"}</span>
        </div>
      </div>
    );
  }

  // ── NORMAL MESSAGE ──
  return (
    <div className="mb-6">
      <div
        ref={bubbleRef}
        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
      >
        {/* Avatar */}
        {!isOwn && sender && (
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mb-1 mr-2">
            <img
              src={
                sender.profilePic ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  sender.fullName
                )}&background=6852D6&color=fff`
              }
              alt={sender.fullName}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div
          className={`flex flex-col gap-1 ${
            isOwn ? "items-end" : "items-start"
          }`}
        >
          {/* ── Reply preview bar ── */}
          {replyTo && (
            <div
              className="mb-1 p-2 bg-gray-100 rounded-lg cursor-pointer text-xs text-gray-700 hover:bg-gray-200"
              onClick={() => {
                // scroll to target
                const target = document.querySelector(
                  `[data-message-id="${replyTo.id}"]`
                );
                if (target) {
                  target.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                  // flash highlight
                  target.classList.add("flash");
                  setTimeout(() => target.classList.remove("flash"), 1000);
                }
              }}
            >
              Replying to:{" "}
              <span className="font-semibold">
                {replyTo.text?.slice(0, 30) || "[media]"}…
              </span>
            </div>
          )}

          <div
            className={`flex items-start gap-1 ${
              isOwn ? "flex-row-reverse" : "flex-row"
            }`}
          >
            {/* ── Message bubble ── */}
            <div
              className={`px-4 py-3 max-w-sm break-words ${
                isOwn
                  ? "bg-blue-500 text-white rounded-2xl rounded-br-md"
                  : "bg-gray-200 text-gray-900 rounded-2xl rounded-bl-md"
              }`}
              style={{ backgroundColor: isOwn ? "#4A90E2" : "#e8e8e8" }}
            >
              {isEditing ? (
                <>
                  <textarea
                    className="textarea textarea-bordered w-full h-24 bg-white text-gray-900"
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        onCancelEdit();
                        setDraftText(message.text || "");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => onSaveEdit(message.id,draftText)}
                    >
                      Save
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Media */}
                  {message.mediaUrl && (
                    <div className="mb-3">
                      <a
                        href={message.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {message.mediaType === "IMAGE" ? (
                          <img
                            src={message.mediaUrl}
                            alt="Attachment"
                            className="rounded-lg w-full max-w-[280px] hover:opacity-90 transition-opacity"
                          />
                        ) : message.mediaType === "VIDEO" ? (
                          <video
                            src={message.mediaUrl}
                            className="rounded-lg w-full max-w-[280px] hover:opacity-90 transition-opacity"
                            controls
                          />
                        ) : (
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="w-5 h-5" />
                            <span className="underline">Download file</span>
                          </div>
                        )}
                      </a>
                    </div>
                  )}

                  {/* Text */}
                  {message.text && (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.text}
                    </div>
                  )}

                  {/* Reactions */}
                  {Object.keys(reactionCounts).length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      {Object.entries(reactionCounts).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          onClick={() => onReaction(emoji)}
                          className={`
                          rounded-full px-2 py-1 flex items-center gap-1 text-xs
                          ${
                            myEmojis.has(emoji)
                              ? "bg-purple-500 text-white"
                              : "bg-white bg-opacity-20 text-gray-800 hover:bg-opacity-30"
                          }
                        `}
                        >
                          <span>{emoji}</span>
                          <span>{count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Action menu */}
            {!isSystem && (
              <div className="relative ml-2" ref={menuRef}>
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
                {showActions && (
                  <div
                    className={`absolute z-50 ${
                      isOwn ? "right-0" : "left-0"
                    } top-8 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[160px]`}
                  >
                    <button
                      onClick={() => {
                        onReply();
                        setShowActions(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                    >
                      <Reply className="w-4 h-4" />
                      Reply
                    </button>
                    {isOwn && (
                      <button
                        onClick={() => {
                          onEdit();
                          setShowActions(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => {
                        copyToClipboard();
                        setShowActions(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                    <button
                      onClick={() => {
                        onOpenEmojiPicker();
                        setShowActions(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                    >
                      <Smile className="w-4 h-4" />
                      React
                    </button>
                    {isOwn && (
                      <>
                        <button
                          onClick={() => {
                            onShowInfo();
                            setShowActions(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                        >
                          <Info className="w-4 h-4" />
                          Message Info
                        </button>
                        <hr className="my-1 border-gray-200" />
                        <button
                          onClick={() => {
                            onDelete();
                            setShowActions(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timestamp & status */}
      <div
        className={`text-xs mt-1 ${
          isOwn ? "text-right mr-2" : "text-left ml-10"
        } flex items-center ${isOwn ? "justify-end" : "justify-start"} gap-1`}
      >
        <span>{formatTime(message.createdAt)}</span>
        {statusIcon()}
      </div>
    </div>
  );
}
