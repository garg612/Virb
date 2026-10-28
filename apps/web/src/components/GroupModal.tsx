"use client";

import React, { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Conversation, User } from "../lib/types";

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  mode: "create" | "settings";
  conversation?: Conversation | null;
  onGroupUpdated?: (updated: Conversation) => void;
  onGroupLeft?: () => void;
}

export const GroupModal: React.FC<GroupModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  mode,
  conversation,
  onGroupUpdated,
  onGroupLeft,
}) => {
  const [groupName, setGroupName] = useState("");
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingUsers(true);
    setErrorMessage("");

    api
      .getAllUsers(1, 100)
      .then((res) => {
        const users = res.users || [];
        setAvailableUsers(
          users.filter((u) => Number(u.id) !== Number(currentUser?.id))
        );
      })
      .catch((err) => {
        console.error("Error fetching users for group:", err);
        setErrorMessage(err.message || "Failed to load users");
      })
      .finally(() => {
        setIsLoadingUsers(false);
      });

    if (mode === "settings" && conversation) {
      setGroupName(conversation.groupName || "");
    } else {
      setGroupName("");
      setSelectedUserIds([]);
      setSearchQuery("");
    }
  }, [isOpen, mode, conversation, currentUser]);

  if (!isOpen) return null;

  const isGroupAdmin = conversation?.groupAdminId === currentUser?.id;

  const filteredUsers = availableUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(query) ||
      u.username.toLowerCase().includes(query)
    );
  });

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setErrorMessage("Please enter a group name");
      return;
    }
    if (selectedUserIds.length === 0) {
      setErrorMessage("Please select at least one member");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const group = await api.createGroup({
        name: groupName.trim(),
        participantIds: selectedUserIds,
      });

      onGroupUpdated?.(group);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create group");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRename = async () => {
    if (!conversation || !groupName.trim()) return;
    setIsSubmitting(true);
    try {
      const updated = await api.renameGroup(conversation.id, groupName.trim());
      onGroupUpdated?.(updated);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to rename group");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMember = async (userId: number) => {
    if (!conversation) return;
    setIsSubmitting(true);
    try {
      const updated = await api.addGroupMember(conversation.id, userId);
      onGroupUpdated?.(updated);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to add member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!conversation) return;
    setIsSubmitting(true);
    try {
      const updated = await api.removeGroupMember(conversation.id, userId);
      onGroupUpdated?.(updated);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to remove member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!conversation) return;
    setIsSubmitting(true);
    try {
      await api.leaveGroup(conversation.id);
      onGroupLeft?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to leave group");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="modal-group-backdrop" className="modal-backdrop">
      <div id="modal-group-content" className="modal-content" style={{ maxWidth: "520px" }}>
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
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>
              {mode === "create" ? "Create New Group" : "Group Settings"}
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "2px" }}>
              {mode === "create"
                ? "Collaborate with multiple team members"
                : "Manage members and settings"}
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

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          {errorMessage && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.82rem",
                marginBottom: "14px",
              }}
            >
              {errorMessage}
            </div>
          )}

          {mode === "create" ? (
            <form
              onSubmit={handleCreateGroup}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <div>
                <label
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-muted)",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Group Name:
                </label>
                <input
                  id="input-group-name"
                  type="text"
                  className="input-field"
                  placeholder="e.g. Design Team"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "6px",
                  }}
                >
                  <label style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    Select Participants ({selectedUserIds.length} selected):
                  </label>
                  {selectedUserIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedUserIds([])}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--accent-rose)",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                      }}
                    >
                      Clear selection
                    </button>
                  )}
                </div>

                {/* Search filter for participants */}
                <input
                  type="text"
                  className="input-field"
                  placeholder="Filter users by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ marginBottom: "8px", padding: "8px 12px", fontSize: "0.85rem" }}
                />

                {/* Available Users List */}
                <div
                  id="group-participants-list"
                  style={{
                    maxHeight: "200px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    padding: "6px",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    background: "rgba(10, 15, 26, 0.5)",
                  }}
                >
                  {isLoadingUsers ? (
                    <div
                      style={{
                        padding: "24px",
                        textAlign: "center",
                        color: "var(--text-subtle)",
                        fontSize: "0.85rem",
                      }}
                    >
                      Loading available members...
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div
                      style={{
                        padding: "24px",
                        textAlign: "center",
                        color: "var(--text-subtle)",
                        fontSize: "0.85rem",
                      }}
                    >
                      {searchQuery
                        ? "No users matching search."
                        : "No other registered users available."}
                    </div>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelected = selectedUserIds.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          id={`group-user-item-${u.id}`}
                          onClick={() => {
                            setSelectedUserIds((prev) =>
                              isSelected
                                ? prev.filter((id) => id !== u.id)
                                : [...prev, u.id]
                            );
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            borderRadius: "var(--radius-sm)",
                            background: isSelected
                              ? "rgba(99, 102, 241, 0.2)"
                              : "rgba(255, 255, 255, 0.03)",
                            border: isSelected
                              ? "1px solid var(--primary-light)"
                              : "1px solid transparent",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <img
                              src={
                                u.avatar ||
                                `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`
                              }
                              alt={u.name}
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                objectFit: "cover",
                                background: "var(--bg-card)",
                              }}
                            />
                            <div>
                              <div
                                style={{
                                  fontSize: "0.88rem",
                                  fontWeight: 600,
                                  color: "var(--text-main)",
                                }}
                              >
                                {u.name}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.72rem",
                                  color: "var(--text-subtle)",
                                }}
                              >
                                @{u.username}
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "4px",
                              border: isSelected
                                ? "none"
                                : "2px solid var(--border-strong)",
                              background: isSelected
                                ? "var(--primary)"
                                : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {isSelected && (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                              >
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <button
                id="btn-submit-create-group"
                type="submit"
                className="btn-primary"
                disabled={isSubmitting || isLoadingUsers}
                style={{ marginTop: "8px", padding: "12px" }}
              >
                {isSubmitting ? "Creating Group..." : "Create Group"}
              </button>
            </form>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Rename */}
              {isGroupAdmin && (
                <div>
                  <label
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--text-muted)",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Group Name:
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      id="input-group-rename"
                      type="text"
                      className="input-field"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                    />
                    <button
                      id="btn-group-rename"
                      className="btn-secondary"
                      onClick={handleRename}
                      disabled={isSubmitting}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Current Members */}
              <div>
                <label
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-muted)",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Members ({conversation?.participants?.length || 0}):
                </label>
                <div
                  style={{
                    maxHeight: "150px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {conversation?.participants?.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        background: "var(--bg-surface)",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <img
                          src={
                            p.avatar ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${p.username}`
                          }
                          alt={p.name}
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                            {p.name}{" "}
                            {p.id === conversation.groupAdminId && (
                              <em
                                style={{
                                  color: "var(--accent-amber)",
                                  fontSize: "0.72rem",
                                  fontWeight: 500,
                                }}
                              >
                                (Admin)
                              </em>
                            )}
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-subtle)" }}>
                            @{p.username}
                          </div>
                        </div>
                      </div>

                      {isGroupAdmin && p.id !== currentUser?.id && (
                        <button
                          onClick={() => handleRemoveMember(p.id)}
                          style={{
                            background: "rgba(239, 68, 68, 0.15)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            color: "var(--accent-rose)",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add member (Admin only) */}
              {isGroupAdmin && (
                <div>
                  <label
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--text-muted)",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Add Member:
                  </label>
                  <select
                    id="select-add-group-member"
                    className="input-field"
                    onChange={(e) => {
                      if (e.target.value) handleAddMember(Number(e.target.value));
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select user to add...
                    </option>
                    {availableUsers
                      .filter(
                        (u) =>
                          !conversation?.participants?.some(
                            (p) => Number(p.id) === Number(u.id)
                          )
                      )
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} (@{u.username})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Leave Group button */}
              <button
                id="btn-leave-group"
                className="btn-danger"
                onClick={handleLeaveGroup}
                disabled={isSubmitting}
                style={{ width: "100%", marginTop: "8px" }}
              >
                Leave Group
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
