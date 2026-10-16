"use client";

import React, { useState, useRef, useEffect } from "react";
import { Conversation, Message, User } from "../lib/types";

interface ChatAreaProps {
  conversation: Conversation | null;
  messages: Message[];
  currentUser: User | null;
  onlineUserIds: number[];
  typingUserIds: number[];
  isPendingRequest?: boolean;
  onAcceptRequest?: () => Promise<void>;
  onRejectRequest?: () => Promise<void>;
  onSendMessage: (content: string, replyToId?: number | null) => Promise<void>;
  onDeleteMessage: (messageId: number) => Promise<void>;
  onEditMessage: (messageId: number, content: string) => Promise<void>;
  onStartCall: (type: "audio" | "video") => void;
  onOpenGroupSettings?: () => void;
  onTyping: () => void;
  onStopTyping: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  messages,
  currentUser,
  onlineUserIds,
  typingUserIds,
  isPendingRequest = false,
  onAcceptRequest,
  onRejectRequest,
  onSendMessage,
  onDeleteMessage,
  onEditMessage,
  onStartCall,
  onOpenGroupSettings,
  onTyping,
  onStopTyping,
}) => {
  const [inputText, setInputText] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!conversation) {
    return (
      <main
        id="empty-chat-state"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at center, rgba(30, 41, 59, 0.4) 0%, transparent 70%)",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: "var(--primary-gradient-subtle)",
            border: "1px solid var(--border-glow)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
            boxShadow: "var(--shadow-glow)",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--primary-light)" strokeWidth="1.8">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
        </div>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "8px" }}>
          Welcome to NexusChat
        </h2>
        <p style={{ color: "var(--text-muted)", maxWidth: "380px", fontSize: "0.95rem", lineHeight: 1.5 }}>
          Select a conversation from the sidebar or click <strong style={{ color: "var(--text-main)" }}>New Chat</strong> to connect with team members and friends in real-time.
        </p>
      </main>
    );
  }

  const otherParticipant = conversation.isGroup
    ? null
    : conversation.participants?.find((p) => p.id !== currentUser?.id);

  const isOtherOnline = otherParticipant ? onlineUserIds.includes(otherParticipant.id) : false;
  const typingOthers = typingUserIds.filter((id) => Number(id) !== Number(currentUser?.id));
  const isTyping = typingOthers.length > 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    onTyping();

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (editingMessage) {
      await onEditMessage(editingMessage.id, inputText.trim());
      setEditingMessage(null);
    } else {
      await onSendMessage(inputText.trim(), replyingTo?.id);
      setReplyingTo(null);
    }

    setInputText("");
    onStopTyping();
  };

  return (
    <main
      id="chat-area-container"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-dark)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <header
        id="chat-header"
        className="glass-panel"
        style={{
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          borderBottom: "1px solid var(--border-subtle)",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ position: "relative" }}>
            <img
              src={
                conversation.isGroup
                  ? conversation.groupAvatar ||
                    `https://api.dicebear.com/7.x/identicon/svg?seed=group-${conversation.id}`
                  : otherParticipant?.avatar ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${otherParticipant?.username || "user"}`
              }
              alt="Recipient Avatar"
              style={{
                width: "42px",
                height: "42px",
                borderRadius: conversation.isGroup ? "12px" : "50%",
                objectFit: "cover",
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
              }}
            />
            {!conversation.isGroup && (
              <span
                style={{
                  position: "absolute",
                  bottom: "2px",
                  right: "2px",
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: isOtherOnline ? "var(--accent-emerald)" : "var(--text-subtle)",
                  border: "2px solid var(--bg-surface)",
                  boxShadow: isOtherOnline ? "0 0 6px var(--accent-emerald)" : "none",
                }}
              />
            )}
          </div>

          <div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700 }}>
              {conversation.isGroup
                ? conversation.groupName || `Group Chat #${conversation.id}`
                : otherParticipant?.name || "Direct Message"}
            </h2>
            <div style={{ fontSize: "0.78rem", color: isTyping ? "var(--accent-cyan)" : "var(--text-subtle)" }}>
              {isTyping ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                  typing...
                </span>
              ) : conversation.isGroup ? (
                `${conversation.participants?.length || 0} participants`
              ) : isOtherOnline ? (
                "Online"
              ) : (
                otherParticipant ? `@${otherParticipant.username}` : "Offline"
              )}
            </div>
          </div>
        </div>

        {/* Call & Group Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isPendingRequest ? (
            <span
              style={{
                padding: "4px 10px",
                borderRadius: "12px",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                color: "var(--accent-amber)",
                fontSize: "0.78rem",
                fontWeight: 600,
              }}
            >
              {conversation.isGroup ? "Group Invite" : "Request Pending"}
            </span>
          ) : (
            <>
              {!conversation.isGroup && (
                <>
                  <button
                    id="btn-chat-audio-call"
                    className="btn-icon"
                    onClick={() => onStartCall("audio")}
                    title="Start Audio Call"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                  </button>

                  <button
                    id="btn-chat-video-call"
                    className="btn-icon"
                    onClick={() => onStartCall("video")}
                    title="Start Video Call"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="23 7 16 12 23 17 23 7"></polygon>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                    </svg>
                  </button>
                </>
              )}

              {conversation.isGroup && onOpenGroupSettings && (
                <button
                  id="btn-chat-group-settings"
                  className="btn-icon"
                  onClick={onOpenGroupSettings}
                  title="Group Settings"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {/* Messages Scroll Feed */}
      <div
        id="messages-scroll-area"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {messages.length === 0 ? (
          <div style={{ margin: "auto", textAlign: "center", color: "var(--text-subtle)" }}>
            <p style={{ fontSize: "0.95rem" }}>No messages here yet.</p>
            <p style={{ fontSize: "0.8rem", marginTop: "4px" }}>Say hello to start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const senderId = msg.senderId ?? msg.SenderId ?? msg.sender?.id;
            const isSelf = senderId === currentUser?.id;

            return (
              <div
                key={msg.id}
                id={`message-bubble-${msg.id}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isSelf ? "flex-end" : "flex-start",
                  position: "relative",
                  maxWidth: "75%",
                  alignSelf: isSelf ? "flex-end" : "flex-start",
                }}
              >
                {/* Sender label for group chat */}
                {conversation.isGroup && !isSelf && (
                  <span style={{ fontSize: "0.72rem", color: "var(--accent-cyan)", marginBottom: "3px", marginLeft: "4px", fontWeight: 600 }}>
                    {msg.sender?.name || "User"}
                  </span>
                )}

                {/* Reply quote banner if replying to another message */}
                {msg.replyTo && (
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      borderLeft: "3px solid var(--primary-light)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      marginBottom: "4px",
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <strong style={{ color: "var(--text-main)", marginRight: "4px" }}>
                      {msg.replyTo.sender?.name || "Replying"}:
                    </strong>
                    {msg.replyTo.content || "[Media]"}
                  </div>
                )}

                {/* Main bubble */}
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: isSelf ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: isSelf ? "var(--primary-gradient)" : "var(--bg-card)",
                    border: isSelf ? "none" : "1px solid var(--border-subtle)",
                    boxShadow: isSelf ? "0 4px 14px rgba(99, 102, 241, 0.25)" : "var(--shadow-sm)",
                    color: isSelf ? "#ffffff" : "var(--text-main)",
                    position: "relative",
                    fontSize: "0.92rem",
                    lineHeight: 1.45,
                    wordBreak: "break-word",
                  }}
                >
                  {msg.isDeleted ? (
                    <em style={{ color: isSelf ? "rgba(255,255,255,0.7)" : "var(--text-subtle)", fontStyle: "italic" }}>
                      This message was deleted
                    </em>
                  ) : (
                    <>
                      <div>{msg.content}</div>
                      {msg.isEdited && (
                        <span style={{ fontSize: "0.7rem", opacity: 0.7, marginLeft: "6px" }}>(edited)</span>
                      )}
                    </>
                  )}

                  {/* Message Timestamp & Seen Status */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: "4px",
                      marginTop: "4px",
                      fontSize: "0.68rem",
                      opacity: 0.75,
                    }}
                  >
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {isSelf && (
                      <span title={msg.isSeen ? "Seen" : "Delivered"}>
                        {msg.isSeen ? "✓✓" : "✓"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Message Hover Actions */}
                {!msg.isDeleted && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      marginTop: "3px",
                      opacity: 0.6,
                    }}
                  >
                    <button
                      onClick={() => setReplyingTo(msg)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-subtle)",
                        cursor: "pointer",
                        fontSize: "0.72rem",
                        padding: "2px 4px",
                      }}
                      title="Reply"
                    >
                      Reply
                    </button>

                    {isSelf && (
                      <>
                        <button
                          onClick={() => {
                            setEditingMessage(msg);
                            setInputText(msg.content || "");
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--text-subtle)",
                            cursor: "pointer",
                            fontSize: "0.72rem",
                            padding: "2px 4px",
                          }}
                          title="Edit"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => onDeleteMessage(msg.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--accent-rose)",
                            cursor: "pointer",
                            fontSize: "0.72rem",
                            padding: "2px 4px",
                          }}
                          title="Delete"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Typing indicator bubble */}
        {isTyping && (
          <div
            id="chat-typing-bubble"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "16px 16px 16px 4px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-glow)",
              alignSelf: "flex-start",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginRight: "4px" }}>
              {conversation.isGroup
                ? `${conversation.participants?.find((p) => typingOthers.includes(p.id))?.name || "Someone"} is typing`
                : `${otherParticipant?.name || "User"} is typing`}
            </span>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--primary-light)", animation: "bounceDots 1.4s infinite ease-in-out" }} />
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--primary-light)", animation: "bounceDots 1.4s infinite ease-in-out 0.2s" }} />
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--primary-light)", animation: "bounceDots 1.4s infinite ease-in-out 0.4s" }} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Area: Request Banner OR Input Dock */}
      {isPendingRequest ? (
        <div
          id="chat-request-action-bar"
          style={{
            padding: "20px 24px",
            background: "linear-gradient(180deg, rgba(17, 24, 39, 0.95) 0%, rgba(10, 15, 26, 0.98) 100%)",
            borderTop: "1px solid var(--border-glow)",
            boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.4)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "14px",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)" }}>
              {conversation.isGroup
                ? `Group Invitation: ${conversation.groupName || "Group Chat"}`
                : `Message Request from ${otherParticipant?.name || "User"}`}
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px", maxWidth: "480px" }}>
              {conversation.isGroup
                ? "You have been added to this group. Accept to join and start chatting with members, or decline to remove yourself from the group."
                : "Accept to start chatting and move this conversation into your active messages, or decline to remove this request."}
            </div>
          </div>

          <div style={{ display: "flex", gap: "14px" }}>
            <button
              id="btn-accept-request"
              className="btn-primary"
              onClick={onAcceptRequest}
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                boxShadow: "0 0 18px rgba(16, 185, 129, 0.4)",
                padding: "9px 24px",
                fontSize: "0.88rem",
                fontWeight: 600,
              }}
            >
              Accept {conversation.isGroup ? "Invitation" : "Request"}
            </button>
            <button
              id="btn-reject-request"
              className="btn-danger"
              onClick={onRejectRequest}
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                color: "#f87171",
                padding: "9px 24px",
                fontSize: "0.88rem",
                fontWeight: 600,
              }}
            >
              Decline & Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          id="chat-input-dock"
          className="glass-panel"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            padding: "12px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {/* Reply or Edit Notification Bar */}
          {(replyingTo || editingMessage) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(99, 102, 241, 0.12)",
                border: "1px solid var(--border-glow)",
                borderRadius: "var(--radius-sm)",
                padding: "6px 12px",
                fontSize: "0.82rem",
              }}
            >
              <span style={{ color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {editingMessage ? (
                  <>
                    <strong style={{ color: "var(--accent-amber)" }}>Editing message:</strong>{" "}
                    {editingMessage.content}
                  </>
                ) : (
                  <>
                    <strong style={{ color: "var(--primary-light)" }}>Replying to:</strong>{" "}
                    {replyingTo?.content}
                  </>
                )}
              </span>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setEditingMessage(null);
                  setInputText("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-subtle)",
                  cursor: "pointer",
                  padding: "2px 6px",
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Quick emoji reaction buttons */}
            <div style={{ display: "flex", gap: "4px" }}>
              {["👍", "❤️", "🔥"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setInputText((prev) => prev + emoji)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "1.1rem",
                    padding: "4px",
                    borderRadius: "4px",
                    transition: "transform 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <input
              id="input-chat-message"
              type="text"
              className="input-field"
              placeholder={editingMessage ? "Update your message..." : "Type a message..."}
              value={inputText}
              onChange={handleInputChange}
              style={{ flex: 1 }}
            />

            <button
              id="btn-send-message"
              type="submit"
              className="btn-primary"
              style={{ padding: "10px 18px" }}
              disabled={!inputText.trim()}
            >
              <span>{editingMessage ? "Update" : "Send"}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      )}
    </main>
  );
};
