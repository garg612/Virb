"use client";

import React, { useState } from "react";
import { Conversation, User } from "../lib/types";

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: number | null;
  onSelectConversation: (conversation: Conversation) => void;
  currentUser: User | null;
  onlineUserIds: number[];
  onOpenNewChat: () => void;
  isLoading?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  currentUser,
  onlineUserIds,
  onOpenNewChat,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "direct" | "groups" | "requests">("all");

  const isAcceptedByMe = (conv: Conversation) => {
    if (!currentUser) return true;
    if (conv.acceptedUserIds && conv.acceptedUserIds.length > 0) {
      return conv.acceptedUserIds.includes(currentUser.id);
    }
    return true;
  };

  const pendingRequests = conversations.filter((c) => !isAcceptedByMe(c));
  const pendingRequestsCount = pendingRequests.length;

  const getConversationDetails = (conv: Conversation) => {
    if (conv.isGroup) {
      return {
        title: conv.groupName || `Group Chat #${conv.id}`,
        avatar:
          conv.groupAvatar ||
          `https://api.dicebear.com/7.x/identicon/svg?seed=group-${conv.id}`,
        isOnline: false,
        subtitle: `${conv.participants?.length || 0} members`,
      };
    }
    const otherParticipant = conv.participants?.find((p) => p.id !== currentUser?.id);
    const isOnline = otherParticipant ? onlineUserIds.includes(otherParticipant.id) : false;
    return {
      title: otherParticipant?.name || "Direct Message",
      avatar:
        otherParticipant?.avatar ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${otherParticipant?.username || "user"}`,
      isOnline,
      subtitle: otherParticipant ? `@${otherParticipant.username}` : "",
    };
  };

  const filteredConversations = conversations.filter((conv) => {
    const details = getConversationDetails(conv);
    const matchesSearch =
      details.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      details.subtitle.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const accepted = isAcceptedByMe(conv);

    if (activeTab === "requests") {
      return !accepted;
    }

    // Normal tabs only show accepted chats
    if (!accepted) return false;

    if (activeTab === "direct") return !conv.isGroup;
    if (activeTab === "groups") return conv.isGroup;
    return true;
  });

  return (
    <aside
      id="chat-sidebar"
      style={{
        width: "360px",
        minWidth: "320px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      {/* Search Header */}
      <div style={{ padding: "18px 16px 12px 16px" }}>
        <div style={{ position: "relative" }}>
          <input
            id="input-sidebar-search"
            type="text"
            className="input-field"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "38px", fontSize: "0.88rem" }}
          />
          <svg
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-subtle)",
            }}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginTop: "12px",
            background: "rgba(255, 255, 255, 0.03)",
            padding: "4px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {[
            { id: "all", label: "All" },
            { id: "direct", label: "Direct" },
            { id: "groups", label: "Groups" },
            { id: "requests", label: "Requests", badge: pendingRequestsCount },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-conversations-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  flex: 1,
                  padding: "6px 2px",
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  background: isActive ? "var(--primary-gradient)" : "transparent",
                  color: isActive ? "#ffffff" : "var(--text-muted)",
                  transition: "all 0.2s",
                }}
              >
                <span>{tab.label}</span>
                {tab.badge && tab.badge > 0 ? (
                  <span
                    style={{
                      background: isActive ? "rgba(255, 255, 255, 0.3)" : "var(--accent-rose)",
                      color: "#ffffff",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      padding: "1px 5px",
                      borderRadius: "10px",
                      minWidth: "16px",
                      textAlign: "center",
                    }}
                  >
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversations List */}
      <div
        id="conversations-scroll-container"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 8px 16px 8px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--text-subtle)" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                border: "3px solid var(--border-subtle)",
                borderTopColor: "var(--primary)",
                borderRadius: "50%",
                margin: "0 auto 12px auto",
                animation: "spin 0.8s linear infinite",
              }}
            />
            Loading chats...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "var(--text-subtle)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {activeTab === "requests" ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              )}
            </div>
            <p style={{ fontSize: "0.9rem" }}>
              {activeTab === "requests" ? "No pending requests" : "No conversations yet"}
            </p>
            {activeTab !== "requests" && (
              <button
                id="btn-sidebar-start-first-chat"
                className="btn-primary"
                onClick={onOpenNewChat}
                style={{ fontSize: "0.82rem", padding: "8px 16px" }}
              >
                Start a Conversation
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = conv.id === activeConversationId;
            const details = getConversationDetails(conv);
            const lastMsg = conv.messages?.[0];
            const isPending = !isAcceptedByMe(conv);

            return (
              <div
                key={conv.id}
                id={`conversation-item-${conv.id}`}
                onClick={() => onSelectConversation(conv)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  background: isSelected
                    ? "var(--primary-gradient-subtle)"
                    : isPending
                    ? "rgba(245, 158, 11, 0.05)"
                    : "transparent",
                  border: isSelected
                    ? "1px solid var(--border-glow)"
                    : isPending
                    ? "1px dashed rgba(245, 158, 11, 0.3)"
                    : "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = isPending
                      ? "rgba(245, 158, 11, 0.1)"
                      : "rgba(255, 255, 255, 0.04)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = isPending
                      ? "rgba(245, 158, 11, 0.05)"
                      : "transparent";
                  }
                }}
              >
                {/* Avatar with Status Indicator */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <img
                    src={details.avatar}
                    alt={details.title}
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: conv.isGroup ? "12px" : "50%",
                      objectFit: "cover",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  />
                  {!conv.isGroup && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: "2px",
                        right: "2px",
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: details.isOnline
                          ? "var(--accent-emerald)"
                          : "var(--text-subtle)",
                        border: "2px solid var(--bg-surface)",
                        boxShadow: details.isOnline
                          ? "0 0 6px var(--accent-emerald)"
                          : "none",
                      }}
                    />
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "2px",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "0.92rem",
                        color: "var(--text-main)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {details.title}
                    </span>
                    {isPending ? (
                      <span
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--accent-amber)",
                          background: "rgba(245, 158, 11, 0.15)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {conv.isGroup ? "Group Invite" : "Request"}
                      </span>
                    ) : lastMsg ? (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-subtle)",
                          flexShrink: 0,
                        }}
                      >
                        {new Date(lastMsg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    ) : null}
                  </div>

                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: lastMsg ? "var(--text-muted)" : "var(--text-subtle)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {isPending ? (
                      <span style={{ color: "var(--accent-amber)", fontStyle: "italic" }}>
                        {conv.isGroup ? "Invitation pending..." : "New message request"}
                      </span>
                    ) : lastMsg ? (
                      lastMsg.isDeleted ? (
                        <em style={{ color: "var(--text-subtle)" }}>Message deleted</em>
                      ) : (
                        lastMsg.content || "[Media]"
                      )
                    ) : (
                      details.subtitle || "No messages yet"
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
