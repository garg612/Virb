"use client";

import React, { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Product, User } from "../lib/types";

interface RequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

export const RequirementModal: React.FC<RequirementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<"create" | "my_items">("create");

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("car");
  const [image, setImage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // My requirements state
  const [myItems, setMyItems] = useState<Product[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const fetchMyItems = async () => {
    setLoadingItems(true);
    try {
      const items = await api.getMyRequirements();
      setMyItems(items);
    } catch (err: any) {
      console.error("Failed to load my requirements", err);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      if (activeTab === "my_items") {
        fetchMyItems();
      }
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !price) {
      setError("Please fill in all required fields (title, description, and price)");
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setError("Please enter a valid positive price");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await api.createRequirement({
        title: title.trim(),
        description: description.trim(),
        price: numPrice,
        currency,
        category,
        image: image.trim() || undefined,
      });

      setSuccessMsg("🎉 Item listed in requirements! It will remain hidden until a buyer searches for it.");
      setTitle("");
      setDescription("");
      setPrice("");
      setImage("");

      // Switch to my items tab after short delay
      setTimeout(() => {
        setActiveTab("my_items");
        fetchMyItems();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to create requirement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    try {
      await api.deleteRequirement(id);
      setMyItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete requirement");
    }
  };

  return (
    <div id="modal-requirement-backdrop" className="modal-backdrop">
      <div
        id="modal-requirement-content"
        className="modal-content"
        style={{ maxWidth: "560px", width: "95%", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
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
              <span>🏷️</span> Sell Requirements
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Post items for sale. Requirements stay hidden until searched by buyers.
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
        <div
          style={{
            display: "flex",
            padding: "12px 24px 0 24px",
            borderBottom: "1px solid var(--border-subtle)",
            gap: "16px",
          }}
        >
          <button
            onClick={() => setActiveTab("create")}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === "create" ? "2px solid var(--primary-light)" : "2px solid transparent",
              color: activeTab === "create" ? "var(--text-main)" : "var(--text-subtle)",
              fontWeight: activeTab === "create" ? 600 : 500,
              paddingBottom: "10px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Post New Item
          </button>
          <button
            onClick={() => {
              setActiveTab("my_items");
              fetchMyItems();
            }}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === "my_items" ? "2px solid var(--primary-light)" : "2px solid transparent",
              color: activeTab === "my_items" ? "var(--text-main)" : "var(--text-subtle)",
              fontWeight: activeTab === "my_items" ? 600 : 500,
              paddingBottom: "10px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            My Listed Items ({myItems.length})
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {activeTab === "create" ? (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Privacy Notice Alert */}
              <div
                style={{
                  background: "rgba(99, 102, 241, 0.12)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 14px",
                  display: "flex",
                  gap: "10px",
                  alignItems: "flex-start",
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>🔒</span>
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                  <strong style={{ color: "var(--primary-light)" }}>Private Discovery:</strong> This requirement will
                  not appear in any public browsing feed. Only buyers who specifically search for keywords matching
                  your product (e.g. &quot;car&quot;) will be able to see it.
                </div>
              </div>

              {error && (
                <div
                  style={{
                    background: "rgba(244, 63, 94, 0.15)",
                    color: "var(--accent-rose)",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.85rem",
                  }}
                >
                  {error}
                </div>
              )}

              {successMsg && (
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "var(--accent-emerald)",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.85rem",
                  }}
                >
                  {successMsg}
                </div>
              )}

              {/* Product Title */}
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "6px" }}>
                  Product Title *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. 2022 Honda Civic Sedan, MacBook Pro M2, etc."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Category & Price */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "6px" }}>
                    Category
                  </label>
                  <select
                    className="input-field"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ background: "var(--bg-card)", color: "var(--text-main)" }}
                  >
                    <option value="car">🚗 Cars & Vehicles</option>
                    <option value="electronics">💻 Electronics & Tech</option>
                    <option value="phone">📱 Mobile Phones</option>
                    <option value="furniture">🛋️ Home & Furniture</option>
                    <option value="fashion">👕 Fashion & Apparel</option>
                    <option value="general">📦 Other Products</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "6px" }}>
                    Price ($ USD) *
                  </label>
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-subtle)",
                      }}
                    >
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      className="input-field"
                      style={{ paddingLeft: "28px" }}
                      placeholder="e.g. 15000"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "6px" }}>
                  Image URL (Optional)
                </label>
                <input
                  type="url"
                  className="input-field"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                />
                <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                  <button
                    type="button"
                    onClick={() =>
                      setImage(
                        "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80"
                      )
                    }
                    style={{
                      fontSize: "0.72rem",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      padding: "3px 8px",
                      color: "var(--text-subtle)",
                      cursor: "pointer",
                    }}
                  >
                    🚗 Sample Car
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setImage(
                        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80"
                      )
                    }
                    style={{
                      fontSize: "0.72rem",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      padding: "3px 8px",
                      color: "var(--text-subtle)",
                      cursor: "pointer",
                    }}
                  >
                    💻 Sample Laptop
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "6px" }}>
                  Description & Specifications *
                </label>
                <textarea
                  className="input-field"
                  rows={4}
                  placeholder="Provide condition, mileage, color, specifications, pickup details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
                style={{
                  marginTop: "8px",
                  padding: "12px",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  justifyContent: "center",
                }}
              >
                {isSubmitting ? "Listing Item..." : "Publish Private Requirement"}
              </button>
            </form>
          ) : (
            <div>
              {loadingItems ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-subtle)" }}>
                  Loading your listed requirements...
                </div>
              ) : myItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📦</div>
                  <p>You haven&apos;t posted any sell requirements yet.</p>
                  <button
                    className="btn-secondary"
                    onClick={() => setActiveTab("create")}
                    style={{ marginTop: "12px", fontSize: "0.85rem" }}
                  >
                    Post an item now
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {myItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-md)",
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                        {item.images && item.images.length > 0 ? (
                          <img
                            src={item.images[0]}
                            alt={item.title}
                            style={{
                              width: "52px",
                              height: "52px",
                              borderRadius: "var(--radius-sm)",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "52px",
                              height: "52px",
                              borderRadius: "var(--radius-sm)",
                              background: "rgba(255, 255, 255, 0.05)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "1.4rem",
                            }}
                          >
                            🏷️
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <h4
                              style={{
                                fontSize: "0.95rem",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {item.title}
                            </h4>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                padding: "2px 8px",
                                borderRadius: "var(--radius-full)",
                                background:
                                  item.status === "ACTIVE"
                                    ? "rgba(16, 185, 129, 0.15)"
                                    : "rgba(99, 102, 241, 0.2)",
                                color: item.status === "ACTIVE" ? "var(--accent-emerald)" : "var(--primary-light)",
                                fontWeight: 600,
                              }}
                            >
                              {item.status}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            ${item.price.toLocaleString()} {item.currency} • Category: {item.category}
                          </div>
                          {item.orders && item.orders.length > 0 && (
                            <div style={{ fontSize: "0.75rem", color: "var(--accent-emerald)", marginTop: "2px" }}>
                              Sold to @{item.orders[0].buyer?.username || "buyer"}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="btn-icon"
                        title="Delete listing"
                        style={{ color: "var(--accent-rose)", width: "32px", height: "32px" }}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

