"use client";

import React, { useState } from "react";
import { api } from "../lib/api";
import { Product, User } from "../lib/types";

interface MarketSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onStartChatWithSeller: (product: Product) => Promise<void>;
  onOpenPayment: (product: Product) => void;
}

export const MarketSearchModal: React.FC<MarketSearchModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onStartChatWithSeller,
  onOpenPayment,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [startingChatId, setStartingChatId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (queryText: string) => {
    setSearchQuery(queryText);
    const trimmed = queryText.trim();
    if (!trimmed) {
      setProducts([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const results = await api.searchMarketplace(trimmed);
      setProducts(results);
    } catch (err: any) {
      console.error("Market search error", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleChat = async (product: Product) => {
    setStartingChatId(product.id);
    try {
      await onStartChatWithSeller(product);
      onClose();
    } finally {
      setStartingChatId(null);
    }
  };

  const handleQuickTagClick = (tag: string) => {
    handleSearch(tag);
  };

  return (
    <div id="modal-market-search-backdrop" className="modal-backdrop">
      <div
        id="modal-market-search-content"
        className="modal-content"
        style={{ maxWidth: "680px", width: "95%", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
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
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🔍</span> Search Requirements & Products
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Find private seller listings, view seller IDs, start instant chats, and complete secure payments.
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

        {/* Search Input Bar */}
        <div style={{ padding: "16px 24px 10px 24px" }}>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "1.1rem",
                color: "var(--text-subtle)",
              }}
            >
              🔍
            </span>
            <input
              id="input-market-search"
              type="text"
              className="input-field"
              placeholder="Search for car, laptop, phone, camera..."
              style={{ paddingLeft: "42px", fontSize: "0.95rem" }}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch("")}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text-subtle)",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Search Chips */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", fontWeight: 500 }}>Try searching:</span>
            {["car", "honda", "laptop", "phone", "iphone", "electronics"].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleQuickTagClick(tag)}
                style={{
                  fontSize: "0.75rem",
                  background: searchQuery.toLowerCase() === tag ? "var(--primary-dark)" : "rgba(255, 255, 255, 0.05)",
                  color: searchQuery.toLowerCase() === tag ? "#ffffff" : "var(--text-muted)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-full)",
                  padding: "3px 10px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Results Body */}
        <div style={{ padding: "10px 24px 20px 24px", overflowY: "auto", flex: 1 }}>
          {isSearching ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-subtle)" }}>
              Searching private listings...
            </div>
          ) : !hasSearched ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 16px",
                color: "var(--text-muted)",
                background: "rgba(255, 255, 255, 0.02)",
                borderRadius: "var(--radius-md)",
                border: "1px dashed var(--border-subtle)",
              }}
            >
              <div style={{ fontSize: "2.4rem", marginBottom: "10px" }}>🚗 💻 🏷️</div>
              <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "6px" }}>
                Requirements Are Hidden by Default
              </h4>
              <p style={{ fontSize: "0.84rem", maxWidth: "420px", margin: "0 auto", lineHeight: 1.5 }}>
                Sellers keep their items private in the requirement section. Search for any specific product keyword
                (like <strong>&quot;car&quot;</strong> or <strong>&quot;laptop&quot;</strong>) above to reveal matching
                sellers and their listings.
              </p>
            </div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🔎</div>
              <p>No active seller requirements found matching &quot;{searchQuery}&quot;.</p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-subtle)", marginTop: "4px" }}>
                Make sure the seller has listed it under sell requirements.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--text-subtle)", fontWeight: 500 }}>
                Found {products.length} product{products.length > 1 ? "s" : ""} matching &quot;{searchQuery}&quot;:
              </div>

              {products.map((product) => {
                const isMyOwn = currentUser?.id === product.sellerId;
                return (
                  <div
                    key={product.id}
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                      transition: "border-color 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                      {/* Product Thumbnail */}
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          style={{
                            width: "88px",
                            height: "88px",
                            borderRadius: "var(--radius-sm)",
                            objectFit: "cover",
                            background: "var(--bg-surface)",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "88px",
                            height: "88px",
                            borderRadius: "var(--radius-sm)",
                            background: "rgba(255, 255, 255, 0.05)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "2rem",
                          }}
                        >
                          🚗
                        </div>
                      )}

                      {/* Product Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                          }}
                        >
                          <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)" }}>
                            {product.title}
                          </h4>
                          <div
                            style={{
                              fontSize: "1.15rem",
                              fontWeight: 800,
                              color: "var(--accent-emerald)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            ${product.price.toLocaleString()} {product.currency}
                          </div>
                        </div>

                        <span
                          style={{
                            display: "inline-block",
                            fontSize: "0.72rem",
                            background: "rgba(99, 102, 241, 0.15)",
                            color: "var(--primary-light)",
                            padding: "2px 8px",
                            borderRadius: "var(--radius-full)",
                            fontWeight: 600,
                            marginTop: "4px",
                            textTransform: "uppercase",
                          }}
                        >
                          {product.category}
                        </span>

                        <p
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-muted)",
                            marginTop: "8px",
                            lineHeight: 1.4,
                            whiteSpace: "pre-line",
                          }}
                        >
                          {product.description}
                        </p>
                      </div>
                    </div>

                    {/* Seller Banner & Action Buttons */}
                    <div
                      style={{
                        paddingTop: "12px",
                        borderTop: "1px solid var(--border-subtle)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "10px",
                      }}
                    >
                      {/* Seller Info Badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <img
                          src={
                            product.seller.avatar ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${product.seller.username}`
                          }
                          alt={product.seller.name}
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>
                            {product.seller.name}{" "}
                            <span
                              style={{
                                fontSize: "0.72rem",
                                color: "var(--accent-cyan)",
                                background: "rgba(6, 182, 212, 0.12)",
                                padding: "2px 6px",
                                borderRadius: "var(--radius-sm)",
                                marginLeft: "4px",
                              }}
                            >
                              Seller #{product.seller.id}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)" }}>
                            @{product.seller.username}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {isMyOwn ? (
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--text-subtle)",
                              fontStyle: "italic",
                            }}
                          >
                            (Your listing)
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => handleChat(product)}
                              disabled={startingChatId === product.id}
                              style={{ fontSize: "0.82rem", padding: "7px 12px", gap: "6px" }}
                            >
                              <span>💬</span>
                              {startingChatId === product.id ? "Opening..." : "Chat with Seller"}
                            </button>

                            <button
                              type="button"
                              className="btn-primary"
                              onClick={() => {
                                onClose();
                                onOpenPayment(product);
                              }}
                              style={{ fontSize: "0.82rem", padding: "7px 14px", gap: "6px" }}
                            >
                              <span>💳</span>
                              Buy & Pay
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

