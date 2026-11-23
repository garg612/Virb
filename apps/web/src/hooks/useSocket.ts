"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Message, User, Conversation } from "../lib/types";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface UseSocketProps {
  currentUser: User | null;
  onNewMessage?: (message: Message) => void;
  onMessageSeen?: (data: { conversationId: number }) => void;
  onMessageDeleted?: (data: { messageId: number }) => void;
  onMessageEdited?: (data: { message: Message }) => void;
  onConversationUpdated?: (conversation: Conversation) => void;
  onConversationRemoved?: (data: { conversationId: number }) => void;
}

export function useSocket({
  currentUser,
  onNewMessage,
  onMessageSeen,
  onMessageDeleted,
  onMessageEdited,
  onConversationUpdated,
  onConversationRemoved,
}: UseSocketProps) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<number, number[]>>({}); // conversationId -> userIds

  const onNewMessageRef = useRef(onNewMessage);
  const onMessageSeenRef = useRef(onMessageSeen);
  const onMessageDeletedRef = useRef(onMessageDeleted);
  const onMessageEditedRef = useRef(onMessageEdited);
  const onConversationUpdatedRef = useRef(onConversationUpdated);
  const onConversationRemovedRef = useRef(onConversationRemoved);
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const joinedRoomsRef = useRef<Set<number>>(new Set());

  // Always keep callback refs current without triggering socket reconnects
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onMessageSeenRef.current = onMessageSeen;
    onMessageDeletedRef.current = onMessageDeleted;
    onMessageEditedRef.current = onMessageEdited;
    onConversationUpdatedRef.current = onConversationUpdated;
    onConversationRemovedRef.current = onConversationRemoved;
  });

  // Initialize socket - only runs when currentUser changes
  useEffect(() => {
    if (!currentUser?.id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      setOnlineUserIds([]);
      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join", currentUser.id);

      // Re-join any previously tracked rooms on reconnection
      joinedRoomsRef.current.forEach((convId) => {
        socket.emit("joinConversation", convId);
      });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("onlineUsers", (users: (string | number)[]) => {
      setOnlineUserIds(users.map((u) => Number(u)));
    });

    socket.on("newMessage", (msg: Message) => {
      onNewMessageRef.current?.(msg);
    });

    socket.on("messageseen", (data: { conversationId: number }) => {
      onMessageSeenRef.current?.(data);
    });

    socket.on("message deleted", (data: { messageId: number }) => {
      onMessageDeletedRef.current?.(data);
    });

    socket.on("message edited", (data: { message: Message }) => {
      onMessageEditedRef.current?.(data);
    });

    socket.on("typing", (data: { userId: number | string; conversationId: number | string }) => {
      const convId = Number(data.conversationId);
      const uId = Number(data.userId);
      if (!convId || !uId) return;

      setTypingUsers((prev) => {
        const currentList = prev[convId] || [];
        if (currentList.includes(uId)) return prev;
        return {
          ...prev,
          [convId]: [...currentList, uId],
        };
      });

      // Automatically expire typing state after 3.5s of no typing pulses
      const key = `${convId}-${uId}`;
      if (typingTimeoutsRef.current[key]) {
        clearTimeout(typingTimeoutsRef.current[key]);
      }
      typingTimeoutsRef.current[key] = setTimeout(() => {
        setTypingUsers((prev) => ({
          ...prev,
          [convId]: (prev[convId] || []).filter((id) => id !== uId),
        }));
        delete typingTimeoutsRef.current[key];
      }, 3500);
    });

    socket.on("stopTyping", (data: { userId: number | string; conversationId: number | string }) => {
      const convId = Number(data.conversationId);
      const uId = Number(data.userId);
      if (!convId || !uId) return;

      const key = `${convId}-${uId}`;
      if (typingTimeoutsRef.current[key]) {
        clearTimeout(typingTimeoutsRef.current[key]);
        delete typingTimeoutsRef.current[key];
      }

      setTypingUsers((prev) => ({
        ...prev,
        [convId]: (prev[convId] || []).filter((id) => id !== uId),
      }));
    });

    socket.on("conversationUpdated", (conv: Conversation) => {
      if (conv?.id) {
        socket.emit("joinConversation", conv.id);
        joinedRoomsRef.current.add(conv.id);
      }
      onConversationUpdatedRef.current?.(conv);
    });

    socket.on("conversationRemoved", (data: { conversationId: number }) => {
      onConversationRemovedRef.current?.(data);
    });

    return () => {
      // Clear typing timeouts
      Object.values(typingTimeoutsRef.current).forEach((t) => clearTimeout(t));
      typingTimeoutsRef.current = {};
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser?.id]);

  const joinConversation = useCallback((conversationId: number) => {
    if (!conversationId) return;
    const numId = Number(conversationId);
    joinedRoomsRef.current.add(numId);
    socketRef.current?.emit("joinConversation", numId);
  }, []);

  const sendTyping = useCallback(
    (conversationId: number) => {
      if (!currentUser || !conversationId) return;
      socketRef.current?.emit("typing", {
        conversationId: Number(conversationId),
        userId: Number(currentUser.id),
      });
    },
    [currentUser]
  );

  const sendStopTyping = useCallback(
    (conversationId: number) => {
      if (!currentUser || !conversationId) return;
      socketRef.current?.emit("stopTyping", {
        conversationId: Number(conversationId),
        userId: Number(currentUser.id),
      });
    },
    [currentUser]
  );

  const markSeen = useCallback(
    (conversationId: number) => {
      if (!currentUser || !conversationId) return;
      socketRef.current?.emit("messageseen", {
        conversationId: Number(conversationId),
        userId: Number(currentUser.id),
      });
    },
    [currentUser]
  );

  return {
    socket: socketRef.current,
    isConnected,
    onlineUserIds,
    typingUsers,
    joinConversation,
    sendTyping,
    sendStopTyping,
    markSeen,
  };
}
