"use client";

import React, { useState } from "react";
import { api } from "../lib/api";
import { User } from "../lib/types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User, token: string) => void;
}

const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/bottts/svg?seed=Felix",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Luna",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Aiden",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Zoe",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Nova",
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [tab, setTab] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await api.register({
        name,
        email,
        username,
        password: password || "Pass123!",
      });
      onAuthSuccess(res.user, res.accessToken);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoUser = async (demoName: string, demoUsername: string) => {
    setIsLoading(true);
    setErrorMessage("");
    const uniqueEmail = `${demoUsername.toLowerCase()}_${Date.now()}@example.com`;

    try {
      const res = await api.register({
        name: demoName,
        email: uniqueEmail,
        username: `${demoUsername.toLowerCase()}_${Math.floor(Math.random() * 900 + 100)}`,
        password: "Password123!",
      });
      onAuthSuccess(res.user, res.accessToken);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create demo session");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="modal-auth-backdrop" className="modal-backdrop">
      <div id="modal-auth-content" className="modal-content">
        {/* Header */}
        <div
          style={{
            padding: "24px 24px 16px 24px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
              {tab === "register" ? "Create an Account" : "Welcome Back"}
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Join NexusChat to experience instant messaging & calls
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

        {/* Tab Switcher */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)" }}>
          <button
            onClick={() => {
              setTab("register");
              setErrorMessage("");
            }}
            style={{
              flex: 1,
              padding: "12px",
              background: "none",
              border: "none",
              borderBottom: tab === "register" ? "2px solid var(--primary)" : "none",
              color: tab === "register" ? "var(--text-main)" : "var(--text-subtle)",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.88rem",
            }}
          >
            Register
          </button>
          <button
            onClick={() => {
              setTab("login");
              setErrorMessage("");
            }}
            style={{
              flex: 1,
              padding: "12px",
              background: "none",
              border: "none",
              borderBottom: tab === "login" ? "2px solid var(--primary)" : "none",
              color: tab === "login" ? "var(--text-main)" : "var(--text-subtle)",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.88rem",
            }}
          >
            Quick Sign In
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "20px 24px" }}>
          {errorMessage && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.85rem",
                marginBottom: "16px",
              }}
            >
              {errorMessage}
            </div>
          )}

          {tab === "register" ? (
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Avatar Selection */}
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  Choose Avatar:
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  {PRESET_AVATARS.map((av) => (
                    <img
                      key={av}
                      src={av}
                      alt="Avatar choice"
                      onClick={() => setSelectedAvatar(av)}
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        border: selectedAvatar === av ? "2px solid var(--primary)" : "2px solid transparent",
                        cursor: "pointer",
                        background: "var(--bg-surface)",
                        padding: "2px",
                        transition: "all 0.15s",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Full Name:
                </label>
                <input
                  id="auth-input-name"
                  type="text"
                  className="input-field"
                  placeholder="e.g. Kushagra Garg"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Username:
                </label>
                <input
                  id="auth-input-username"
                  type="text"
                  className="input-field"
                  placeholder="e.g. kushagra"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Email Address:
                </label>
                <input
                  id="auth-input-email"
                  type="email"
                  className="input-field"
                  placeholder="e.g. kushagra@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Password:
                </label>
                <input
                  id="auth-input-password"
                  type="password"
                  className="input-field"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                id="btn-auth-submit-register"
                type="submit"
                className="btn-primary"
                style={{ width: "100%", marginTop: "6px" }}
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Create Account & Sign In"}
              </button>
            </form>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                Select a demo test identity to instantly enter the chat as that user:
              </p>

              {[
                { name: "Kushagra Garg", user: "kushagra", avatar: PRESET_AVATARS[0] },
                { name: "Alice Smith", user: "alice", avatar: PRESET_AVATARS[1] },
                { name: "Bob Johnson", user: "bob", avatar: PRESET_AVATARS[2] },
              ].map((preset) => (
                <button
                  key={preset.user}
                  id={`btn-demo-login-${preset.user}`}
                  onClick={() => handleQuickDemoUser(preset.name, preset.user)}
                  disabled={isLoading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 14px",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--text-main)",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-glow)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                >
                  <img src={preset.avatar} alt={preset.name} style={{ width: "36px", height: "36px", borderRadius: "50%" }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Sign in as {preset.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>@{preset.user}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
