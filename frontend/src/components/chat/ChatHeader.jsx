import { Video, LogOut } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

const CHAT_MODES = [
  {
    key: "BRIDGE",
    label: "Bridge Mode",
    description: "Normal chat without translation",
    color: "bg-blue-500",
    colorLight: "bg-blue-50",
  },
  {
    key: "LEARNING",
    label: "Learning Mode",
    description: "Incoming messages in your learning language",
    color: "bg-green-500",
    colorLight: "bg-green-50",
  },
  {
    key: "COMFORT",
    label: "Comfort Mode",
    description: "Incoming messages in your native language",
    color: "bg-orange-500",
    colorLight: "bg-orange-50",
  },
];

export default function ChatHeader({
  participant,
  isOnline,
  lastSeen,
  chatMode,
  onChatModeChange,
  onVideoCall,
  disableExit = false, // disable exit during call
  navigateSafe, // safe navigation function from ChatPage
}) {
  const mode = CHAT_MODES.find((m) => m.key === chatMode) || CHAT_MODES[0];

  const renderStatus = () => {
    if (isOnline) {
      return (
        <span className="text-sm text-green-500 font-medium">Online</span>
      );
    }
    if (lastSeen) {
      const formatted = formatDistanceToNow(new Date(lastSeen), {
        addSuffix: true,
      });
      return (
        <span className="text-sm text-gray-500">Last seen {formatted}</span>
      );
    }
    return <span className="text-sm text-gray-500">Offline</span>;
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
          <img
            src={
              participant?.profilePic ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                participant?.fullName || "User"
              )}&background=6852D6&color=fff`
            }
            alt={participant?.fullName || "User"}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 text-base">
            {participant?.fullName}
          </h2>
          {renderStatus()}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Chat Mode Dropdown */}
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 cursor-pointer"
          >
            <div className={`w-2 h-2 rounded-full ${mode.color}`}></div>
            <span className="text-sm font-medium text-gray-700">
              {mode.label}
            </span>
          </div>

          <div
            tabIndex={0}
            className="dropdown-content mt-2 bg-white rounded-lg shadow-lg border p-2 w-72 z-50"
          >
            {CHAT_MODES.map((m) => (
              <div
                key={m.key}
                onClick={() => onChatModeChange(m.key)}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 ${
                  chatMode === m.key ? m.colorLight : ""
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${m.color}`}></div>
                <div>
                  <div className="font-medium text-sm">{m.label}</div>
                  <div className="text-xs text-gray-500">{m.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Video Call */}
        <button
          onClick={onVideoCall}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Video className="w-5 h-5 text-gray-600" />
        </button>

        {/* Exit button */}
        <button
          onClick={() => {
            if (disableExit) {
              toast.error("Cannot exit during a call");
              return;
            }
            navigateSafe ? navigateSafe("/") : null; // fallback navigation
          }}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title={disableExit ? "Cannot exit during call" : "Exit Chat"}
        >
          <LogOut className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
