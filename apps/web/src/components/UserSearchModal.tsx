"use client";

import React, { useState, useEffect } from "react";
import { api } from "../lib/api";
import { User, Product } from "../lib/types";

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onStartChat: (user: User) => Promise<void>;
  onStartChatWithSeller?: (product: Product) => Promise<void>;
  onOpenPayment?: (product: Product) => void;
}

export const UserSearchModal: React.FC<UserSearchModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onStartChat,
  onStartChatWithSeller,
  onOpenPayment,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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

  useEffect(() => {
    if (!searchQuery.trim()) {
      setProducts([]);
      return;
    }
    const timer = setTimeout(() => {
      api
        .searchMarketplace(searchQuery.trim())
        .then((res) => {
          setProducts(res);
        })
        .catch((err) => {
          console.error("Failed to search marketplace in user modal", err);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const handleSelectProductChat = async (product: Product) => {
    if (onStartChatWithSeller) {
      setIsStarting(product.id);
      try {
        await onStartChatWithSeller(product);
        onClose();
      } finally {
        setIsStarting(null);
      }
    }
  };

  return (
    <div id="modal-user-search-backdrop" className="modal-backdrop">
      <div id="modal-user-search-content" className="modal-content" style={{ maxWidth: "560px" }}>
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
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Search & Discover</h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Find users, or search keywords (e.g. &apos;car&apos;) to discover seller requirements
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
            placeholder="Search by username, or type 'car', 'laptop'..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Results List */}
        <div
          id="user-search-results-list"
          style={{
            maxHeight: "420px",
            overflowY: "auto",
            padding: "8px 16px 20px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {/* Matched Products & Sellers Section */}
          {products.length > 0 && (
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "var(--accent-cyan)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "8px",
                  paddingLeft: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>🏷️</span> Matching Seller Requirements ({products.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {products.map((p) => {
                  const isMyOwn = currentUser?.id === p.sellerId;
                  return (
                    <div
                      key={p.id}
                      style={{
                        padding: "12px",
                        borderRadius: "var(--radius-md)",
                        background: "rgba(99, 102, 241, 0.08)",
                        border: "1px solid rgba(99, 102, 241, 0.25)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {p.images && p.images.length > 0 ? (
                            <img
                              src={p.images[0]}
                              alt={p.title}
                              style={{ width: "42px", height: "42px", borderRadius: "6px", objectFit: "cover" }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "42px",
                                height: "42px",
                                borderRadius: "6px",
                                background: "rgba(255, 255, 255, 0.05)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "1.2rem",
                              }}
                            >
                              🚗
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text-main)" }}>
                              {p.title}
                            </div>
                            <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                              Seller: <strong>{p.seller.name}</strong> (@{p.seller.username}){" "}
                              <span
                                style={{
                                  background: "rgba(6, 182, 212, 0.15)",
                                  color: "var(--accent-cyan)",
                                  padding: "1px 5px",
                                  borderRadius: "4px",
                                  fontSize: "0.7rem",
                                }}
                              >
                                Seller #{p.seller.id}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ fontWeight: 800, color: "var(--accent-emerald)", fontSize: "1rem" }}>
                          ${p.price.toLocaleString()} {p.currency}
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
                        {isMyOwn ? (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", fontStyle: "italic" }}>
                            (Your listing)
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => handleSelectProductChat(p)}
                              style={{ fontSize: "0.78rem", padding: "5px 12px" }}
                            >
                              💬 Chat with Seller
                            </button>
                            {onOpenPayment && (
                              <button
                                type="button"
                                className="btn-primary"
                                onClick={() => {
                                  onClose();
                                  onOpenPayment(p);
                                }}
                                style={{ fontSize: "0.78rem", padding: "5px 14px" }}
                              >
                                💳 Buy & Pay
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Users Section */}
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "var(--text-subtle)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "4px",
              paddingLeft: "4px",
            }}
          >
            Registered Users ({filtered.length})
          </div>

          {isLoading ? (
            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-subtle)" }}>
              Loading users...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px", color: "var(--text-subtle)", fontSize: "0.85rem" }}>
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
