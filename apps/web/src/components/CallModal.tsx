"use client";

import React, { useState, useEffect, useRef } from "react";
import { User } from "../lib/types";

interface CallModalProps {
  isOpen: boolean;
  type: "audio" | "video";
  status: "incoming" | "calling" | "connected" | "ended" | "missed" | "rejected";
  otherUser: User | { id: number; name: string; avatar?: string | null };
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  type,
  status,
  otherUser,
  localStream,
  remoteStream,
  isMuted,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
  onAccept,
  onReject,
  onEnd,
}) => {
  const [duration, setDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Call duration timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (status === "connected") {
      timer = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status]);

  // Bind remote stream to video/audio elements
  useEffect(() => {
    if (remoteStream) {
      if (type === "video" && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch((err) => {
          console.warn("Remote video auto-play prevented:", err);
        });
      }
      if (remoteAudioRef.current) {
        if (type === "audio") {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play().catch((err) => {
            console.warn("Remote audio auto-play prevented:", err);
          });
        } else {
          remoteAudioRef.current.srcObject = null;
        }
      }
    }
  }, [remoteStream, type, status]);

  // Bind local stream to local preview video
  useEffect(() => {
    if (localStream && type === "video" && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch((err) => {
        console.warn("Local video auto-play prevented:", err);
      });
    }
  }, [localStream, type, status]);

  if (!isOpen) return null;

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  const isVideoConnected = type === "video" && status === "connected";

  return (
    <div id="modal-call-backdrop" className="modal-backdrop" style={{ zIndex: 2000 }}>
      {/* Hidden audio element strictly for audio-only calls to play remote voice */}
      <audio id="remote-audio-player" ref={remoteAudioRef} autoPlay playsInline />

      <div
        id="modal-call-content"
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: isVideoConnected ? "720px" : "440px",
          padding: isVideoConnected ? "20px" : "32px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          background: "linear-gradient(180deg, #12192a 0%, #090d16 100%)",
          border: "1px solid var(--border-glow)",
          boxShadow: status === "incoming" ? "0 0 40px rgba(99, 102, 241, 0.4)" : "var(--shadow-glow)",
          transition: "max-width 0.3s ease, padding 0.3s ease",
        }}
      >
        {/* If Video Call is Connected, Render High-End Live Video Layout */}
        {isVideoConnected ? (
          <div style={{ width: "100%", position: "relative" }}>
            {/* Top Bar with user info and call timer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "14px",
                width: "100%",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <img
                  src={
                    otherUser.avatar ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUser.name}`
                  }
                  alt={otherUser.name}
                  style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
                />
                <span style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-main)" }}>
                  {otherUser.name}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "0.82rem",
                  color: "var(--accent-emerald)",
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "var(--accent-emerald)",
                    boxShadow: "0 0 8px var(--accent-emerald)",
                  }}
                />
                {formatDuration(duration)} • WebRTC HD
              </div>
            </div>

            {/* Video Viewport Container */}
            <div
              style={{
                width: "100%",
                height: "380px",
                background: "#050811",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                position: "relative",
                border: "1px solid var(--border-subtle)",
                boxShadow: "inset 0 0 20px rgba(0, 0, 0, 0.8)",
              }}
            >
              {/* Remote Video Stream */}
              <video
                id="remote-video-feed"
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />

              {/* Fallback if remote video track hasn't rendered yet */}
              {!remoteStream && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    background: "rgba(5, 8, 17, 0.85)",
                    zIndex: 1,
                  }}
                >
                  <img
                    src={
                      otherUser.avatar ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUser.name}`
                    }
                    alt={otherUser.name}
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "50%",
                      border: "2px solid var(--primary-light)",
                    }}
                  />
                  <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    Connecting video feed...
                  </span>
                </div>
              )}

              {/* Local Video Picture-in-Picture Preview */}
              <div
                style={{
                  position: "absolute",
                  bottom: "16px",
                  right: "16px",
                  width: "130px",
                  height: "98px",
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: "2px solid rgba(255, 255, 255, 0.25)",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.6)",
                  background: "#121927",
                  zIndex: 10,
                }}
              >
                <video
                  id="local-video-pip"
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: "scaleX(-1)", // Mirrored self-view
                    display: isVideoOff ? "none" : "block",
                  }}
                />
                {isVideoOff && (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      background: "rgba(18, 25, 39, 0.95)",
                      color: "var(--text-subtle)",
                      fontSize: "0.7rem",
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                      <path d="M21 21l-3.34-3.34L3 3"></path>
                      <path d="M15 10l5-3v10l-2-1.2"></path>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                    </svg>
                    Camera Off
                  </div>
                )}
                {/* Micro Mute Indicator on PiP */}
                {isMuted && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "4px",
                      left: "4px",
                      background: "rgba(239, 68, 68, 0.85)",
                      borderRadius: "50%",
                      width: "18px",
                      height: "18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                      <line x1="12" y1="19" x2="12" y2="23"></line>
                      <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Audio Call or Pre-Connected Video View */
          <>
            {/* Caller Avatar with Animated Rings */}
            <div style={{ position: "relative", marginBottom: "20px" }}>
              <div
                className={status === "calling" || status === "incoming" ? "call-pulse" : ""}
                style={{
                  width: "110px",
                  height: "110px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "3px solid var(--primary-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--bg-surface)",
                  boxShadow: "0 0 30px rgba(99, 102, 241, 0.25)",
                }}
              >
                <img
                  src={
                    otherUser.avatar ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUser.name}`
                  }
                  alt={otherUser.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </div>

            {/* Title and Call Info */}
            <h3 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "6px" }}>
              {otherUser.name}
            </h3>

            <div
              style={{
                fontSize: "0.92rem",
                color: status === "connected" ? "var(--accent-emerald)" : "var(--primary-light)",
                fontWeight: 600,
                marginBottom: "16px",
                textTransform: "capitalize",
              }}
            >
              {status === "incoming" && `Incoming ${type} Call...`}
              {status === "calling" && `Calling ${type}...`}
              {status === "connected" && `Voice Connected • ${formatDuration(duration)}`}
              {status === "ended" && "Call Ended"}
              {status === "rejected" && "Call Declined"}
              {status === "missed" && "Call Missed"}
            </div>

            {/* Audio Wave Visualizer when Connected */}
            {status === "connected" && type === "audio" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  height: "36px",
                  marginBottom: "20px",
                }}
              >
                {[18, 28, 36, 24, 32, 20, 30].map((h, i) => (
                  <span
                    key={i}
                    className="audio-wave-bar"
                    style={{
                      width: "4px",
                      height: `${h}px`,
                      background: "linear-gradient(180deg, var(--accent-cyan) 0%, var(--primary) 100%)",
                      borderRadius: "2px",
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Action Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "18px",
            marginTop: isVideoConnected ? "16px" : "12px",
            width: "100%",
          }}
        >
          {status === "incoming" ? (
            <>
              {/* Accept Call */}
              <button
                id="btn-call-accept"
                onClick={onAccept}
                style={{
                  width: "58px",
                  height: "58px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  border: "none",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 0 24px rgba(16, 185, 129, 0.55)",
                  transition: "transform 0.2s ease",
                }}
                title="Accept Call"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </button>

              {/* Decline Call */}
              <button
                id="btn-call-decline"
                onClick={onReject}
                style={{
                  width: "58px",
                  height: "58px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  border: "none",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 0 24px rgba(239, 68, 68, 0.45)",
                  transition: "transform 0.2s ease",
                }}
                title="Decline Call"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </>
          ) : (
            <>
              {/* Toggle Microphone */}
              <button
                id="btn-call-toggle-mute"
                className="btn-icon"
                onClick={onToggleMute}
                style={{
                  width: "48px",
                  height: "48px",
                  background: isMuted ? "rgba(239, 68, 68, 0.25)" : "rgba(255, 255, 255, 0.08)",
                  border: isMuted ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid var(--border-subtle)",
                  color: isMuted ? "#f87171" : "var(--text-main)",
                }}
                title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {isMuted ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                )}
              </button>

              {/* Toggle Camera (in video calls) */}
              {type === "video" && (
                <button
                  id="btn-call-toggle-camera"
                  className="btn-icon"
                  onClick={onToggleVideo}
                  style={{
                    width: "48px",
                    height: "48px",
                    background: isVideoOff ? "rgba(239, 68, 68, 0.25)" : "rgba(255, 255, 255, 0.08)",
                    border: isVideoOff ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid var(--border-subtle)",
                    color: isVideoOff ? "#f87171" : "var(--text-main)",
                  }}
                  title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
                >
                  {isVideoOff ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                      <path d="M21 21l-3.34-3.34L3 3"></path>
                      <path d="M15 10l5-3v10l-2-1.2"></path>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="23 7 16 12 23 17 23 7"></polygon>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                    </svg>
                  )}
                </button>
              )}

              {/* End Call */}
              <button
                id="btn-call-end"
                onClick={onEnd}
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  border: "none",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 0 24px rgba(239, 68, 68, 0.45)",
                  transition: "transform 0.2s ease",
                }}
                title="End Call"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path>
                  <line x1="23" y1="1" x2="1" y2="23"></line>
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
