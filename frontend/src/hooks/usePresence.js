// hooks/usePresence.js
import { useEffect, useState } from "react";
import { getSocket } from "../lib/socketClient";

export const usePresence = () => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [lastSeenMap, setLastSeenMap] = useState({}); // { userId: ISOString }

  useEffect(() => {
    const sock = getSocket();
    if (!sock) return;

    const handleOnlineUsers = (users) => setOnlineUsers(users);
    const handleStatusChange = ({ userId, isOnline }) =>
      setOnlineUsers((prev) =>
        isOnline
          ? [...new Set([...prev, userId])]
          : prev.filter((id) => id !== userId)
      );
    const handleLastSeen = ({ userId, lastSeen }) =>
      setLastSeenMap((m) => ({ ...m, [userId]: lastSeen }));

    sock.on("onlineUsers", handleOnlineUsers);
    sock.on("userOnlineStatusChanged", handleStatusChange);
    sock.on("userLastSeenUpdate", handleLastSeen);

    return () => {
      sock.off("onlineUsers", handleOnlineUsers);
      sock.off("userOnlineStatusChanged", handleStatusChange);
      sock.off("userLastSeenUpdate", handleLastSeen);
    };
  }, []);

  return { onlineUsers, lastSeenMap };
};
