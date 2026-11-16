"use client";

import React, { useState } from "react";
import { api } from "../lib/api";
import { Product, Order, User } from "../lib/types";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  currentUser: User | null;
  onPaymentSuccess: (order: Order, conversationId: number) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  product,
  currentUser,
  onPaymentSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "UPI" | "WALLET">("CARD");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);

  if (!isOpen || !product) return null;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    try {
      const result = await api.payForRequirement(product.id, paymentMethod);
      setSuccessOrder(result.order);
      setTimeout(() => {
        onPaymentSuccess(result.order, result.conversationId);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Payment processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="modal-payment-backdrop" className="modal-backdrop">
      <div
        id="modal-payment-content"
        className="modal-content"
        style={{ maxWidth: "480px", width: "95%" }}
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
              <span>💳</span> Secure Checkout
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Pay seller directly with escrow protection
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

        {/* Content */}
        <div style={{ padding: "20px 24px" }}>
          {successOrder ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.2)",
                  color: "var(--accent-emerald)",
                  fontSize: "2rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px auto",
                }}
              >
                ✓
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--accent-emerald)" }}>
                Payment Successful!
              </h3>
              <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginTop: "6px" }}>
                Paid <strong>${product.price.toLocaleString()} {product.currency}</strong> for {product.title}
              </p>
              <div
                style={{
                  margin: "16px 0",
                  padding: "10px",
                  background: "var(--bg-surface)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.78rem",
                  color: "var(--text-subtle)",
                  fontFamily: "monospace",
                }}
              >
                Txn ID: {successOrder.transactionId}
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--accent-cyan)" }}>
                Opening chat room with receipt...
              </p>
            </div>
          ) : (
            <form onSubmit={handlePay} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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

              {/* Order Summary Card */}
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Product Requirement</span>
                  <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-main)" }}>
                    {product.title}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Seller</span>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>
                    {product.seller.name} (@{product.seller.username})
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: "8px",
                    borderTop: "1px solid var(--border-subtle)",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "0.95rem", fontWeight: 700 }}>Total Amount</span>
                  <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--accent-emerald)" }}>
                    ${product.price.toLocaleString()} {product.currency}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "8px" }}>
                  Choose Payment Method
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  {[
                    { id: "CARD", label: "Credit Card", icon: "💳" },
                    { id: "UPI", label: "Instant UPI", icon: "⚡" },
                    { id: "WALLET", label: "Pay Wallet", icon: "👛" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      style={{
                        padding: "10px",
                        borderRadius: "var(--radius-sm)",
                        border:
                          paymentMethod === m.id
                            ? "2px solid var(--primary-light)"
                            : "1px solid var(--border-subtle)",
                        background:
                          paymentMethod === m.id ? "rgba(99, 102, 241, 0.15)" : "var(--bg-card)",
                        color: paymentMethod === m.id ? "#ffffff" : "var(--text-muted)",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ fontSize: "1.2rem" }}>{m.icon}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Detail Inputs */}
              {paymentMethod === "CARD" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                      Card Number
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="4532 •••• •••• 8892"
                      defaultValue="4532 8901 2345 6789"
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                        Expiry (MM/YY)
                      </label>
                      <input type="text" className="input-field" placeholder="12/28" defaultValue="12/28" />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                        CVC
                      </label>
                      <input type="password" className="input-field" placeholder="•••" defaultValue="789" />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === "UPI" && (
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Virtual Payment Address (UPI ID)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="buyer@okaxis"
                    defaultValue="buyer@upi"
                  />
                </div>
              )}

              {paymentMethod === "WALLET" && (
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px 14px",
                    fontSize: "0.82rem",
                    color: "var(--accent-emerald)",
                  }}
                >
                  Available Wallet Balance: <strong>$50,000.00 USD</strong>
                </div>
              )}

              {/* Pay Button */}
              <button
                type="submit"
                className="btn-primary"
                disabled={isProcessing}
                style={{
                  marginTop: "8px",
                  padding: "12px",
                  fontWeight: 700,
                  fontSize: "1rem",
                  justifyContent: "center",
                }}
              >
                {isProcessing
                  ? "Securing Payment..."
                  : `Pay $${product.price.toLocaleString()} ${product.currency}`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

