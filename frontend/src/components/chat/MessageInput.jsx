// src/components/chat/MessageInput.jsx
import { useState, useRef, useEffect } from "react";
import {
  Paperclip,
  Smile,
  Send,
  X,
  Image,
  Video,
  FileText,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";

export default function MessageInput({
  onSend, // send: ({ text?, media? }) => void
  onTyping, // typing: (boolean) => void
  disabled = false,
  replyingTo = null,
  onCancelReply = null,
  // onOpenEmojiPicker is no longer used here
}) {
  const [messageText, setMessageText] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPickerLocal, setShowEmojiPickerLocal] = useState(false);

  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const attachmentMenuRef = useRef(null);

  // When user types in textarea
  const handleInputChange = (e) => {
    const t = e.target.value;
    setMessageText(t);
    onTyping?.(t.length > 0);
  };

  // Only send on send button or Enter
  const handleSend = () => {
    if (!messageText.trim() && !attachedFile) return;
    onSend({
      text: messageText.trim() || undefined,
      media: attachedFile || undefined,
      repliedToId: replyingTo?.id,
    });
    setMessageText("");
    setAttachedFile(null);
    onTyping?.(false);
    setShowAttachmentMenu(false);
    setShowEmojiPickerLocal(false);
  };

  // Enter = send, Shift+Enter = newline
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled) handleSend();
    }
  };

  // When a file is chosen, hold it in state
  const handleFileSelected = (file) => {
    setAttachedFile(file);
    setShowAttachmentMenu(false);
    // focus back to input
    textareaRef.current?.focus();
  };

  // Close attachment menu on outside click
  useEffect(() => {
    if (!showAttachmentMenu) return;
    const onClickOutside = (e) => {
      if (
        attachmentMenuRef.current &&
        !attachmentMenuRef.current.contains(e.target)
      ) {
        setShowAttachmentMenu(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showAttachmentMenu]);

  return (
    <div className="bg-white border-t border-gray-200">
      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-start justify-between">
          <div className="flex-1">
            <div className="text-xs text-gray-500 mb-1">Replying to:</div>
            <div className="text-sm text-gray-700 truncate">
              {replyingTo.text || "Media message"}
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}

      {/* Attachment Preview */}
      {attachedFile && (
        <div className="px-4 py-2 flex items-center gap-2">
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
            {attachedFile.name}
          </span>
          <button onClick={() => setAttachedFile(null)}>
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}

      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Type a message..."
              value={messageText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              className="w-full resize-none rounded-full bg-gray-100 border-0 px-6 py-3 pr-24 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
              style={{ fontFamily: "Inter, sans-serif" }}
            />

            {/* Inline emoji picker */}
            {showEmojiPickerLocal && (
              <div className="absolute bottom-full right-16 mb-2 z-50">
                <EmojiPicker
                  onEmojiClick={(emojiObject, event) => {
                    setMessageText((prev) => prev + emojiObject.emoji);
                    onTyping?.(true);
                    setShowEmojiPickerLocal(false);
                    textareaRef.current?.focus();
                  }}
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {/* Attach menu */}
              <div className="relative" ref={attachmentMenuRef}>
                <button
                  onClick={() => setShowAttachmentMenu((v) => !v)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5 text-gray-600" />
                </button>
                {showAttachmentMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-48 z-50">
                    <button
                      onClick={() => imageInputRef.current.click()}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 w-full text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <Image className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="text-sm text-gray-700">
                        Attach Image
                      </span>
                    </button>
                    <button
                      onClick={() => videoInputRef.current.click()}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 w-full text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Video className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-sm text-gray-700">
                        Attach Video
                      </span>
                    </button>
                    <button
                      onClick={() => documentInputRef.current.click()}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 w-full text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-gray-600" />
                      </div>
                      <span className="text-sm text-gray-700">Attach File</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Emoji (inline) */}
              <button
                onClick={() => setShowEmojiPickerLocal((v) => !v)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                title="Add emoji"
              >
                <Smile className="w-5 h-5 text-gray-600" />
              </button>

              {/* Send */}
              <button
                onClick={handleSend}
                disabled={(!messageText.trim() && !attachedFile) || disabled}
                className="p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Send message"
                style={{
                  backgroundColor:
                    (messageText.trim() || attachedFile) && !disabled
                      ? "#8b5cf6"
                      : "#d1d5db",
                  color: "white",
                }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) =>
            e.target.files?.[0] && handleFileSelected(e.target.files[0])
          }
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) =>
            e.target.files?.[0] && handleFileSelected(e.target.files[0])
          }
        />
        <input
          ref={documentInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.rtf"
          className="hidden"
          onChange={(e) =>
            e.target.files?.[0] && handleFileSelected(e.target.files[0])
          }
        />
      </div>
    </div>
  );
}
