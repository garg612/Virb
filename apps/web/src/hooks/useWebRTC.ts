"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Socket } from "socket.io-client";
import { User } from "../lib/types";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
  ],
};

export type CallStatus =
  | "idle"
  | "calling"
  | "incoming"
  | "connected"
  | "ended"
  | "rejected"
  | "missed";

export interface ActiveCallData {
  callId: number;
  type: "audio" | "video";
  otherUser: User | { id: number; name: string; avatar?: string | null };
  isCaller: boolean;
}

interface UseWebRTCProps {
  socket: Socket | null;
  currentUser: User | null;
}

export function useWebRTC({ socket, currentUser }: UseWebRTCProps) {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [activeCall, setActiveCall] = useState<ActiveCallData | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const incomingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

  const currentUserRef = useRef<User | null>(currentUser);
  const socketRef = useRef<Socket | null>(socket);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // Clean up all media tracks and connection
  const cleanupMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn("Failed to stop track:", e);
        }
      });
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);

    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      try {
        pcRef.current.close();
      } catch (e) {
        console.warn("Failed to close peer connection:", e);
      }
      pcRef.current = null;
    }

    pendingCandidatesRef.current = [];
    incomingOfferRef.current = null;
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  // Create PeerConnection with standard handlers
  const createPeerConnection = useCallback(
    (targetUserId: number) => {
      // Close previous if exists
      if (pcRef.current) {
        try {
          pcRef.current.close();
        } catch (e) {
          console.warn("Error closing prior pc:", e);
        }
        pcRef.current = null;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // When ICE candidate is generated, forward to the other peer via socket
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current && currentUserRef.current) {
          socketRef.current.emit("ice-candidate", {
            candidate: event.candidate,
            receiverId: targetUserId,
            from: currentUserRef.current.id,
          });
        }
      };

      // When remote track arrives, store remote stream
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          const incomingStream = event.streams[0];
          setRemoteStream(new MediaStream(incomingStream.getTracks()));
        } else {
          setRemoteStream((prev) => {
            const stream = prev ? prev : new MediaStream();
            stream.addTrack(event.track);
            return new MediaStream(stream.getTracks());
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setCallStatus("connected");
        } else if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          cleanupMedia();
          setCallStatus("ended");
          setTimeout(() => {
            setCallStatus("idle");
            setActiveCall(null);
          }, 1500);
        }
      };

      return pc;
    },
    [cleanupMedia]
  );

  // Helper: Request user media (mic & camera)
  const acquireMedia = useCallback(async (type: "audio" | "video") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: type === "video" ? { facingMode: "user" } : false,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.warn("Error accessing camera/microphone:", err);
      // Fallback: Try audio only if video request failed
      if (type === "video") {
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          localStreamRef.current = audioOnly;
          setLocalStream(audioOnly);
          return audioOnly;
        } catch (audioErr) {
          console.error("Failed to acquire even audio stream:", audioErr);
        }
      }
      return null;
    }
  }, []);

  // 1. Caller: Start an outgoing call
  const startOutgoingCall = useCallback(
    async (
      receiver: User | { id: number; name: string; avatar?: string | null },
      type: "audio" | "video",
      callId: number
    ) => {
      if (!socketRef.current || !currentUserRef.current) return;

      setActiveCall({
        callId,
        type,
        otherUser: receiver,
        isCaller: true,
      });
      setCallStatus("calling");

      const stream = await acquireMedia(type);
      const pc = createPeerConnection(receiver.id);

      // Add local media tracks to peer connection
      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      // Create WebRTC Offer
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: type === "video",
        });
        await pc.setLocalDescription(offer);

        socketRef.current.emit("calluser", {
          receiverId: receiver.id,
          callId,
          type,
          offer,
          callerInfo: currentUserRef.current,
        });
      } catch (err) {
        console.error("Failed to create offer:", err);
      }
    },
    [acquireMedia, createPeerConnection]
  );

  // 2. Receiver: Accept incoming call
  const acceptIncomingCall = useCallback(async () => {
    if (
      !socketRef.current ||
      !currentUserRef.current ||
      !activeCall ||
      !incomingOfferRef.current
    ) {
      return;
    }

    const callerId = activeCall.otherUser.id;
    const stream = await acquireMedia(activeCall.type);
    const pc = createPeerConnection(callerId);

    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    try {
      // Set remote description (caller's offer)
      await pc.setRemoteDescription(new RTCSessionDescription(incomingOfferRef.current));

      // Process any early buffered ICE candidates
      while (pendingCandidatesRef.current.length > 0) {
        const candidate = pendingCandidatesRef.current.shift();
        if (candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn("Failed to add buffered candidate", e);
          }
        }
      }

      // Create WebRTC Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current.emit("acceptcall", {
        callId: activeCall.callId,
        answer,
        answercallerId: callerId,
      });

      setCallStatus("connected");
    } catch (err) {
      console.error("Error creating answer:", err);
    }
  }, [activeCall, acquireMedia, createPeerConnection]);

  // 3. Caller or Receiver: End the call
  const endCall = useCallback(() => {
    if (socketRef.current && activeCall) {
      socketRef.current.emit("endcall", {
        callId: activeCall.callId,
        receiverId: activeCall.otherUser.id,
      });
    }
    cleanupMedia();
    setCallStatus("ended");
    setTimeout(() => {
      setCallStatus("idle");
      setActiveCall(null);
    }, 1500);
  }, [activeCall, cleanupMedia]);

  // 4. Receiver: Reject incoming call
  const rejectIncomingCall = useCallback(() => {
    if (socketRef.current && activeCall) {
      socketRef.current.emit("rejectcall", {
        callId: activeCall.callId,
        callerId: activeCall.otherUser.id,
      });
    }
    cleanupMedia();
    setCallStatus("idle");
    setActiveCall(null);
  }, [activeCall, cleanupMedia]);

  // Mute/unmute microphone track
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const newEnabled = !audioTracks[0].enabled;
        audioTracks.forEach((t) => {
          t.enabled = newEnabled;
        });
        setIsMuted(!newEnabled);
      }
    }
  }, []);

  // Toggle video camera on/off
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const newEnabled = !videoTracks[0].enabled;
        videoTracks.forEach((t) => {
          t.enabled = newEnabled;
        });
        setIsVideoOff(!newEnabled);
      }
    }
  }, []);

  // Socket event listeners for signaling
  useEffect(() => {
    const sock = socket;
    if (!sock) return;

    // Incoming call
    const handleIncomingCall = (data: {
      callId: number;
      callerInfo: User;
      type: "audio" | "video";
      offer: RTCSessionDescriptionInit;
    }) => {
      incomingOfferRef.current = data.offer;
      setActiveCall({
        callId: data.callId,
        type: data.type,
        otherUser: data.callerInfo,
        isCaller: false,
      });
      setCallStatus("incoming");
    };

    // Caller receives answer
    const handleCallAccepted = async (data: { answer: RTCSessionDescriptionInit; callId: number }) => {
      const pc = pcRef.current;
      if (pc && data.answer) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));

          // Process any queued ICE candidates
          while (pendingCandidatesRef.current.length > 0) {
            const candidate = pendingCandidatesRef.current.shift();
            if (candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {
                console.warn("Failed to add buffered candidate on caller:", e);
              }
            }
          }
          setCallStatus("connected");
        } catch (err) {
          console.error("Error setting remote description for answer:", err);
        }
      }
    };

    // ICE candidate exchange
    const handleIceCandidate = async (data: { candidate: any }) => {
      const candidate = data.candidate || data;
      if (!candidate) return;

      const pc = pcRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding ice candidate:", err);
        }
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    };

    const handleCallEnded = () => {
      cleanupMedia();
      setCallStatus("ended");
      setTimeout(() => {
        setCallStatus("idle");
        setActiveCall(null);
      }, 1500);
    };

    const handleCallRejected = () => {
      cleanupMedia();
      setCallStatus("rejected");
      setTimeout(() => {
        setCallStatus("idle");
        setActiveCall(null);
      }, 1500);
    };

    const handleCallMissed = () => {
      cleanupMedia();
      setCallStatus("missed");
      setTimeout(() => {
        setCallStatus("idle");
        setActiveCall(null);
      }, 1500);
    };

    sock.on("incomingcall", handleIncomingCall);
    sock.on("callaccepted", handleCallAccepted);
    sock.on("ice-candidate", handleIceCandidate);
    sock.on("callended", handleCallEnded);
    sock.on("callrejected", handleCallRejected);
    sock.on("callmissed", handleCallMissed);

    return () => {
      sock.off("incomingcall", handleIncomingCall);
      sock.off("callaccepted", handleCallAccepted);
      sock.off("ice-candidate", handleIceCandidate);
      sock.off("callended", handleCallEnded);
      sock.off("callrejected", handleCallRejected);
      sock.off("callmissed", handleCallMissed);
    };
  }, [socket, cleanupMedia]);

  return {
    callStatus,
    activeCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    startOutgoingCall,
    acceptIncomingCall,
    rejectIncomingCall,
    endCall,
    toggleMute,
    toggleVideo,
  };
}
