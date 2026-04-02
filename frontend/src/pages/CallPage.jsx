import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import toast from "react-hot-toast";
import useAuthUser from "../hooks/useAuthUser";
import { useSocket } from "../hooks/useSocket"; // Corrected hook import
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
} from "lucide-react";

const CallPage = () => {
  const { authUser } = useAuthUser();
  const { socket, isConnected } = useSocket({ user: authUser }); // Use corrected hook
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const callId = searchParams.get("callId");
  const peerId = searchParams.get("peerId"); // ID of the other user
  const isCaller = searchParams.get("isCaller") === 'true';

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null); // Ref to store the RTCPeerConnection instance

  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // --- Helper Functions ---
  // Store callbacks in refs to use stable versions in useEffect cleanup/handlers
  const streamCleanupRef = useRef();
  const handleEndCallRef = useRef();

  const streamCleanup = useCallback(() => {
    console.log("[WebRTC] Cleaning up streams...");
    localStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
  }, [localStream, screenStream]);

  const handleEndCall = useCallback(() => {
    console.log("[WebRTC] Handling End Call cleanup...");
    streamCleanupRef.current(); // Use ref version
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
      console.log("[WebRTC] Peer connection closed.");
    }
    toast("Call has ended.");
    if (window.opener && !window.closed) {
      window.close();
    }
    setTimeout(() => {
        if (!window.closed && window.location.pathname.includes('/call/')) { // Check if still on call page
            navigate(`/chat/${conversationId}`);
        }
    }, 100);
  }, [conversationId, navigate]);

  // Update refs when useCallback functions change
  useEffect(() => {
    streamCleanupRef.current = streamCleanup;
  }, [streamCleanup]);

  useEffect(() => {
    handleEndCallRef.current = handleEndCall;
  }, [handleEndCall]);


  // --- Main WebRTC Logic ---
  useEffect(() => {
    if (!isConnected || !socket || !peerId || !callId) {
      console.log(`[WebRTC] Waiting. Connected: ${isConnected}, Socket: ${!!socket}, PeerId: ${peerId}, CallId: ${callId}`);
      if (isConnected && (!peerId || !callId)) {
          toast.error("Call info missing.");
          navigate(`/chat/${conversationId}`);
      }
      return;
    }

    console.log(`[WebRTC] Initializing. Role: ${isCaller ? 'Caller' : 'Receiver'}, Peer: ${peerId}, Call: ${callId}`);

    // Prevent re-initialization
    if (peerRef.current) return;

    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    peerRef.current = pc;
    console.log("[WebRTC] PC created.");

    // --- Monitoring ---
    pc.oniceconnectionstatechange = () => log(`ICE State: ${pc.iceConnectionState}`);
    pc.onconnectionstatechange = () => log(`Connection State: ${pc.connectionState}`);
    pc.onsignalingstatechange = () => log(`Signaling State: ${pc.signalingState}`);

    // --- Remote Stream ---
    const remote = new MediaStream();
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
    pc.ontrack = (event) => {
      log("🔹 Remote track received:", event.track.kind);
      event.streams[0].getTracks().forEach((track) => remote.addTrack(track));
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remote) {
          remoteVideoRef.current.srcObject = remote; // Re-attach if needed
      }
    };

    // --- ICE Candidates ---
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        log("📤 Sending ICE candidate");
        socket.emit("webrtc-ice-candidate", { candidate: event.candidate, receiverId: peerId });
      } else { log("✅ ICE gathering complete") }
    };

    // --- Local Media ---
    const setupMedia = async () => {
      log("Setting up local media...");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        log("Got local stream.");
        setLocalStream(stream); // Store in state for controls/cleanup
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach((track) => {
            if (!pc.getSenders().find(s => s.track === track)) {
                log("Adding local track:", track.kind);
                pc.addTrack(track, stream);
            }
        });
        return stream;
      } catch (err) {
        console.error("Media access error:", err);
        toast.error("Could not access camera/mic.");
        handleEndCallRef.current(); // Use ref
        return null;
      }
    };

    // --- Signaling Handlers ---
    const handleOffer = async ({ sdp, senderId }) => {
      log("📩 Received OFFER");
      if (isCaller || !peerRef.current || pc.signalingState !== 'stable') return;
      const stream = await setupMedia(); // Get media first
      if (!stream || !peerRef.current) return;
      try {
        log("Setting remote description (offer)...");
        // ✅ FIX: Use the full SDP object received
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        log("Creating ANSWER...");
        const answer = await pc.createAnswer();
        log("Setting local description (answer)...");
        await pc.setLocalDescription(answer);
        log("📤 Sending ANSWER to", senderId);
        // ✅ FIX: Send the full localDescription object
        socket.emit("webrtc-answer", { sdp: pc.localDescription, receiverId: senderId });
      } catch (err) { log("Error handling offer:", err); handleEndCallRef.current() }
    };

    const handleAnswer = async ({ sdp }) => {
      log("📩 Received ANSWER");
      if (!isCaller || !peerRef.current || pc.signalingState !== 'have-local-offer') return;
      try {
        log("Setting remote description (answer)...");
         // ✅ FIX: Use the full SDP object received
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) { log("Error handling answer:", err); handleEndCallRef.current() }
    };

    const handleIceCandidate = async ({ candidate }) => {
      log("📩 Received ICE candidate");
      if (!peerRef.current || !candidate || pc.signalingState === 'closed') return;
      if (pc.remoteDescription == null && !isCaller) {
         log("Queuing ICE candidate..."); // Simple queue
         setTimeout(() => handleIceCandidate({ candidate }), 100);
         return;
      }
      try {
        await pc.addIceCandidate(candidate);
        log("Added received ICE candidate.");
      } catch (err) { console.error("Error adding ICE candidate:", err) }
    };

    // --- Register Listeners ---
    socket.on("callEnded", handleEndCallRef.current); // Use ref
    socket.on("webrtc-offer", handleOffer);
    socket.on("webrtc-answer", handleAnswer);
    socket.on("webrtc-ice-candidate", handleIceCandidate);
    log("Socket listeners registered.");

    // --- Initiate (Caller Only) ---
    const initiateCall = async () => {
      if (isCaller) {
        log("Caller starting initiation...");
        const stream = await setupMedia();
        if (!stream || !peerRef.current) return;
        try {
          log("Creating OFFER...");
          const offer = await pc.createOffer();
          log("Setting local description (offer)...");
          await pc.setLocalDescription(offer);
          log("📤 Sending OFFER to", peerId);
          // ✅ FIX: Send the full localDescription object
          socket.emit("webrtc-offer", { sdp: pc.localDescription, receiverId: peerId });
        } catch (err) { log("Error creating/sending offer:", err); handleEndCallRef.current() }
      } else { log("Receiver waiting for offer...") }
    };

    initiateCall();

    // --- Cleanup ---
    return () => {
      log("Cleaning up CallPage...");
      socket.off("webrtc-offer", handleOffer);
      socket.off("webrtc-answer", handleAnswer);
      socket.off("webrtc-ice-candidate", handleIceCandidate);
      socket.off("callEnded", handleEndCallRef.current); // Use ref
      if (streamCleanupRef.current) streamCleanupRef.current(); // Use ref
      if (peerRef.current) {
          peerRef.current.close();
          peerRef.current = null;
          log("Peer connection closed in cleanup.");
      }
    };
    // ✅ FIX: Corrected dependency array. Functions wrapped in useCallback are stable and don't need to be listed.
  }, [socket, isConnected, callId, peerId, isCaller, conversationId, navigate]); // Removed handleEndCall, streamCleanup


  // --- UI Control Toggles --- (Mostly Unchanged) ---
  const toggleMute = () => { 
    localStream?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));setIsMuted((p) => !p);
    };

  const toggleCamera = () => {
    localStream?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsCameraOff((p) => !p);
  };

  const stopScreenShare = useCallback(() => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    const sender = peerRef.current?.getSenders().find((s) => s.track?.kind === "video");
    if (sender && videoTrack) {
        log("Reverting to camera track.");
        sender.replaceTrack(videoTrack).catch(err => log("Error replacing track:", err));
    } else { log("Could not find sender/track to revert screen share.") }
    screenStream?.getTracks().forEach((t) => t.stop());
    setScreenStream(null);
    setIsScreenSharing(false);
  }, [localStream, screenStream]);

   const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const sender = peerRef.current?.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(screen.getVideoTracks()[0]);
        screen.getVideoTracks()[0].onended = () => stopScreenShare();
        setScreenStream(screen);
        setIsScreenSharing(true);
      } catch (err) {
        console.error("Error sharing screen:", err);
        toast.error("Could not start screen sharing.");
      }
    } else stopScreenShare();
  };

  // Helper log function for context
  const log = (...args) => console.log(`[CallPage:${isCaller ? "Caller" : "Receiver"}]`, ...args);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white relative">
      <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover bg-black" onError={(e) => log("Remote video error:", e)} />
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="absolute bottom-24 md:bottom-6 right-6 w-48 md:w-1/4 rounded-lg border-2 border-white shadow-lg bg-black"
        onError={(e) => log("Local video error:", e)}
      />
      <div className="absolute bottom-6 flex flex-wrap justify-center gap-4 p-2 bg-black bg-opacity-50 rounded-lg">
        {/* Buttons unchanged */}
        <button onClick={toggleMute} className={`btn btn-circle ${isMuted ? 'btn-error' : 'btn-secondary'}`}>{isMuted ? "Unmute" : "Mute"}</button>
        <button onClick={toggleCamera} className={`btn btn-circle ${isCameraOff ? 'btn-error' : 'btn-secondary'}`}>{isCameraOff ? "Cam On" : "Cam Off"}</button>
        <button onClick={toggleScreenShare} className="btn btn-circle btn-primary">{isScreenSharing ? "Stop" : "Share"}</button>
        <button
          onClick={() => {
            log("End Call button clicked.");
            socket.emit("end-call", { callId });
            handleEndCallRef.current(); // Use ref
          }}
          className="btn btn-circle btn-error"
        >
          End
        </button>
      </div>
    </div>
  );
};

export default CallPage;