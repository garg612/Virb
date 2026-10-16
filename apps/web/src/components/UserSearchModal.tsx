"use client";

import React, { useState, useEffect } from "react";
import { api } from "../lib/api";
import { User } from "../lib/types";

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onStartChat: (user: User) => Promise<void>;
}

export const UserSearchModal: React.FC<UserSearchModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onStartChat,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    api
      .getAllUsers(1, 50)
      .then((res) => {
        setUsers(res.users.filter((u) => u.id !== currentUser?.id));
      })
      .catch((err) => {
        console.error("Failed to load users", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectUser = async (user: User) => {
    setIsStarting(user.id);
    try {
      await onStartChat(user);
      onClose();
    } finally {
      setIsStarting(null);
    }
  };

  return (
    <div id="modal-user-search-backdrop" className="modal-backdrop">
      <div id="modal-user-search-content" className="modal-content">
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px 24px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Find Users</h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Start a direct conversation with any registered user
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-subtle)",
              cursor: "pointer",
              fontSize: "1.2rem",
            }}
          >
            ✕
          </button>
        </div>

        {/* Search Input */}
        <div style={{ padding: "16px 24px 8px 24px" }}>
          <input
            id="input-user-search"
            type="text"
            className="input-field"
            placeholder="Search by name or @username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Users List */}
        <div
          id="user-search-results-list"
          style={{
            maxHeight: "360px",
            overflowY: "auto",
            padding: "8px 16px 20px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-subtle)" }}>
              Loading users...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-subtle)" }}>
              No matching users found.
            </div>
          ) : (
            filtered.map((user) => (
              <div
                key={user.id}
                id={`search-user-item-${user.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <img
                    src={
                      user.avatar ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`
                    }
                    alt={user.name}
                    style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--bg-card)" }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-main)" }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>
                      @{user.username}
                    </div>
                  </div>
                </div>

                <button
                  id={`btn-chat-with-${user.id}`}
                  className="btn-primary"
                  onClick={() => handleSelectUser(user)}
                  disabled={isStarting === user.id}
                  style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                >
                  {isStarting === user.id ? "Connecting..." : "Chat"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
