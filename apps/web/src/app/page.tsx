"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { User, Conversation, Message } from "../lib/types";
import { api } from "../lib/api";
import { useSocket } from "../hooks/useSocket";
import { useWebRTC } from "../hooks/useWebRTC";
import { Navbar } from "../components/Navbar";
import { Sidebar } from "../components/Sidebar";
import { ChatArea } from "../components/ChatArea";
import { AuthModal } from "../components/AuthModal";
import { CallModal } from "../components/CallModal";
import { UserSearchModal } from "../components/UserSearchModal";
import { GroupModal } from "../components/GroupModal";

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  // Keep a stable ref to activeConversation for socket callbacks
  const activeConversationRef = useRef<Conversation | null>(null);
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [groupModalState, setGroupModalState] = useState<{ isOpen: boolean; mode: "create" | "settings" }>({
    isOpen: false,
    mode: "create",
  });

  // Initialize Auth state
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser =
        localStorage.getItem("chat_user") || localStorage.getItem("user");
      if (storedUser) {
        try {
          setCurrentUser(JSON.parse(storedUser));
        } catch {
          setIsAuthOpen(true);
        }
      } else {
        setIsAuthOpen(true);
      }
    }
  }, []);

  // Helper to safely append unique message
  const appendMessageDeduplicated = (prev: Message[], msg: Message): Message[] => {
    if (prev.some((m) => Number(m.id) === Number(msg.id))) {
      return prev;
    }
    return [...prev, msg];
  };

  // Socket handlers (stable callback with no changing dependencies)
  const handleIncomingMessage = useCallback((newMsg: Message) => {
    const currentActive = activeConversationRef.current;
    if (currentActive && Number(newMsg.conversationId) === Number(currentActive.id)) {
      setMessages((prev) => appendMessageDeduplicated(prev, newMsg));
    }

    // Update sidebar conversations last message
    setConversations((prev) =>
      prev.map((c) => {
        if (Number(c.id) === Number(newMsg.conversationId)) {
          return {
            ...c,
            messages: [newMsg],
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      })
    );
  }, []);

  const handleMessageSeen = useCallback((data: { conversationId: number }) => {
    const currentActive = activeConversationRef.current;
    if (currentActive && Number(currentActive.id) === Number(data.conversationId)) {
      setMessages((prev) =>
        prev.map((m) => ({
          ...m,
          isSeen: true,
        }))
      );
    }
  }, []);

  const handleMessageDeleted = useCallback((data: { messageId: number }) => {
    setMessages((prev) =>
      prev.map((m) => (Number(m.id) === Number(data.messageId) ? { ...m, isDeleted: true, content: null } : m))
    );
  }, []);

  const handleMessageEdited = useCallback((data: { message: Message }) => {
    setMessages((prev) =>
      prev.map((m) => (Number(m.id) === Number(data.message.id) ? data.message : m))
    );
  }, []);

  const handleConversationUpdated = useCallback((conv: Conversation) => {
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === conv.id);
      if (exists) {
        return prev.map((c) => (c.id === conv.id ? conv : c));
      }
      return [conv, ...prev];
    });

    if (activeConversationRef.current?.id === conv.id) {
      setActiveConversation(conv);
    }
  }, []);

  const handleConversationRemoved = useCallback((data: { conversationId: number }) => {
    setConversations((prev) => prev.filter((c) => c.id !== data.conversationId));
    if (activeConversationRef.current?.id === data.conversationId) {
      setActiveConversation(null);
      setMessages([]);
    }
  }, []);

  const {
    socket,
    isConnected,
    onlineUserIds,
    typingUsers,
    joinConversation,
    sendTyping,
    sendStopTyping,
    markSeen,
  } = useSocket({
    currentUser,
    onNewMessage: handleIncomingMessage,
    onMessageSeen: handleMessageSeen,
    onMessageDeleted: handleMessageDeleted,
    onMessageEdited: handleMessageEdited,
    onConversationUpdated: handleConversationUpdated,
    onConversationRemoved: handleConversationRemoved,
  });

  // Dedicated WebRTC Hook for real-time audio and video peer-to-peer streaming
  const {
    callStatus,
    activeCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    startOutgoingCall,
    acceptIncomingCall,
    rejectIncomingCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useWebRTC({
    socket,
    currentUser,
  });

  // Fetch conversations
  const loadConversations = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingConversations(true);
    try {
      const convs = await api.getMyConversations();
      setConversations(convs);

      // Auto-join socket rooms for real-time updates and typing indicators
      convs.forEach((c: Conversation) => {
        joinConversation(c.id);
      });

      // Maintain active conversation or set first
      if (activeConversationRef.current) {
        const updated = convs.find((c: Conversation) => c.id === activeConversationRef.current?.id);
        if (updated) setActiveConversation(updated);
      } else if (convs.length > 0) {
        setActiveConversation(convs[0]);
      }
    } catch (err) {
      console.error("Failed to fetch conversations", err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [currentUser, joinConversation]);

  useEffect(() => {
    if (currentUser) {
      loadConversations();
    }
  }, [currentUser, loadConversations]);

  // Load messages ONLY when active conversation ID changes
  useEffect(() => {
    if (!activeConversation?.id) {
      setMessages([]);
      return;
    }

    const convId = activeConversation.id;
    joinConversation(convId);
    markSeen(convId);

    api
      .getMessages(convId)
      .then((msgs) => {
        // Guarantee uniqueness by message ID
        const seen = new Set<number>();
        const unique = msgs.filter((m) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
        setMessages(unique);
      })
      .catch((err) => console.error("Failed to load messages", err));
  }, [activeConversation?.id, joinConversation, markSeen]);

  // Action: Select conversation
  const handleSelectConversation = (conv: Conversation) => {
    setActiveConversation(conv);
    markSeen(conv.id);
  };

  // Action: Send message (guarantees NO duplicate addition)
  const handleSendMessage = async (content: string, replyToId?: number | null) => {
    if (!activeConversation) return;
    try {
      const sent = await api.sendMessage({
        conversationId: activeConversation.id,
        content,
        replyToId,
      });

      // Add sent message only if not already added by socket
      setMessages((prev) => appendMessageDeduplicated(prev, sent));
      loadConversations();
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  // Action: Delete message
  const handleDeleteMessage = async (messageId: number) => {
    try {
      await api.deleteMessage(messageId);
      setMessages((prev) =>
        prev.map((m) => (Number(m.id) === Number(messageId) ? { ...m, isDeleted: true, content: null } : m))
      );
    } catch (err) {
      console.error("Failed to delete message", err);
    }
  };

  // Action: Edit message
  const handleEditMessage = async (messageId: number, content: string) => {
    try {
      const updated = await api.editMessage(messageId, content);
      setMessages((prev) =>
        prev.map((m) => (Number(m.id) === Number(messageId) ? updated : m))
      );
    } catch (err) {
      console.error("Failed to edit message", err);
    }
  };

  // Action: Start WebRTC Audio or Video Call
  const handleStartCall = async (type: "audio" | "video") => {
    if (!activeConversation || activeConversation.isGroup || !currentUser) return;
    const receiver = activeConversation.participants.find((p) => p.id !== currentUser.id);
    if (!receiver) return;

    try {
      const call = await api.startCall(receiver.id, type);
      await startOutgoingCall(receiver, type, call.id);
    } catch (err) {
      console.error("Failed to initiate call", err);
    }
  };

  // Action: Start direct chat with user from discovery modal
  const handleStartChatWithUser = async (user: User) => {
    try {
      const conv = await api.createConversation(user.id);
      await loadConversations();
      setActiveConversation(conv);
    } catch (err) {
      console.error("Failed to start chat", err);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setActiveConversation(null);
    setConversations([]);
    setMessages([]);
    setIsAuthOpen(true);
  };

  // Check if active conversation is an unaccepted incoming request for currentUser
  const isPendingRequest = Boolean(
    activeConversation &&
    currentUser &&
    activeConversation.acceptedUserIds &&
    activeConversation.acceptedUserIds.length > 0 &&
    !activeConversation.acceptedUserIds.includes(currentUser.id)
  );

  const handleAcceptRequest = async () => {
    if (!activeConversation) return;
    try {
      const updated = await api.acceptRequest(activeConversation.id);
      setActiveConversation(updated);
      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
    } catch (err) {
      console.error("Failed to accept request", err);
    }
  };

  const handleRejectRequest = async () => {
    if (!activeConversation) return;
    try {
      await api.rejectRequest(activeConversation.id);
      const removedId = activeConversation.id;
      setConversations((prev) => prev.filter((c) => c.id !== removedId));
      setActiveConversation(null);
      setMessages([]);
    } catch (err) {
      console.error("Failed to reject request", err);
    }
  };

  return (
    <div id="app-root-container" className="app-container">
      {/* Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        isConnected={isConnected}
        onOpenNewChat={() => setIsSearchOpen(true)}
        onOpenNewGroup={() => setGroupModalState({ isOpen: true, mode: "create" })}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main Split Layout */}
      <div className="main-content">
        <Sidebar
          conversations={conversations}
          activeConversationId={activeConversation?.id || null}
          onSelectConversation={handleSelectConversation}
          currentUser={currentUser}
          onlineUserIds={onlineUserIds}
          onOpenNewChat={() => setIsSearchOpen(true)}
          isLoading={isLoadingConversations}
        />

        <ChatArea
          conversation={activeConversation}
          messages={messages}
          currentUser={currentUser}
          onlineUserIds={onlineUserIds}
          typingUserIds={activeConversation ? typingUsers[activeConversation.id] || [] : []}
          isPendingRequest={isPendingRequest}
          onAcceptRequest={handleAcceptRequest}
          onRejectRequest={handleRejectRequest}
          onSendMessage={handleSendMessage}
          onDeleteMessage={handleDeleteMessage}
          onEditMessage={handleEditMessage}
          onStartCall={handleStartCall}
          onOpenGroupSettings={() => setGroupModalState({ isOpen: true, mode: "settings" })}
          onTyping={() => activeConversation && sendTyping(activeConversation.id)}
          onStopTyping={() => activeConversation && sendStopTyping(activeConversation.id)}
        />
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthOpen(false);
        }}
      />

      <UserSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        currentUser={currentUser}
        onStartChat={handleStartChatWithUser}
      />

      <GroupModal
        isOpen={groupModalState.isOpen}
        mode={groupModalState.mode}
        conversation={activeConversation}
        currentUser={currentUser}
        onClose={() => setGroupModalState({ isOpen: false, mode: "create" })}
        onGroupUpdated={(updated) => {
          setActiveConversation(updated);
          loadConversations();
        }}
        onGroupLeft={() => {
          setActiveConversation(null);
          loadConversations();
        }}
      />

      {/* WebRTC Live Audio/Video Call Modal */}
      {activeCall && callStatus !== "idle" && (
        <CallModal
          isOpen={true}
          type={activeCall.type}
          status={callStatus}
          otherUser={activeCall.otherUser}
          localStream={localStream}
          remoteStream={remoteStream}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onAccept={acceptIncomingCall}
          onReject={rejectIncomingCall}
          onEnd={endCall}
        />
      )}
    </div>
  );
}
