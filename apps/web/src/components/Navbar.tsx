"use client";

import React from "react";
import { User } from "../lib/types";

interface NavbarProps {
  currentUser: User | null;
  isConnected: boolean;
  onOpenNewChat: () => void;
  onOpenNewGroup: () => void;
  onLogout: () => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  isConnected,
  onOpenNewChat,
  onOpenNewGroup,
  onLogout,
  onOpenAuth,
}) => {
  return (
    <header
      id="main-navbar"
      className="glass-panel"
      style={{
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        borderBottom: "1px solid var(--border-subtle)",
        zIndex: 50,
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "var(--radius-md)",
            background: "var(--primary-gradient)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 16px rgba(99, 102, 241, 0.4)",
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <div>
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              background: "linear-gradient(90deg, #ffffff 0%, #cbd5e1 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1.1,
            }}
          >
            NexusChat
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: isConnected ? "var(--accent-emerald)" : "var(--accent-amber)",
                boxShadow: isConnected ? "0 0 8px var(--accent-emerald)" : "none",
              }}
            />
            <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 500 }}>
              {isConnected ? "Live Socket Connected" : "Connecting..."}
            </span>
          </div>
        </div>
      </div>

      {/* Actions & Profile */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {currentUser ? (
          <>
            <button
              id="btn-navbar-new-chat"
              className="btn-secondary"
              onClick={onOpenNewChat}
              style={{ fontSize: "0.85rem", padding: "8px 14px" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Chat
            </button>

            <button
              id="btn-navbar-new-group"
              className="btn-secondary"
              onClick={onOpenNewGroup}
              style={{ fontSize: "0.85rem", padding: "8px 14px" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              New Group
            </button>

            {/* User Profile Pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "4px 12px 4px 6px",
                borderRadius: "var(--radius-full)",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <img
                src={
                  currentUser.avatar ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`
                }
                alt={currentUser.name}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  background: "var(--bg-card)",
                }}
              />
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>
                  {currentUser.name}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)" }}>
                  @{currentUser.username}
                </div>
              </div>
            </div>

            {/* Logout button */}
            <button
              id="btn-navbar-logout"
              onClick={onLogout}
              className="btn-icon"
              title="Logout"
              style={{ width: "36px", height: "36px" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </>
        ) : (
          <button id="btn-navbar-signin" className="btn-primary" onClick={onOpenAuth}>
            Sign In / Register
          </button>
        )}
      </div>
    </header>
  );
};
