import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import prisma from "../db/prisma.js";
import { markCallMissedIfStillRinging } from "../utils/call-status.js";

let io: Server | undefined;

const onlineUsers = new Map<any, string>();

const initSocketServer = (server: HttpServer): void => {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // user joins app
    socket.on("join", (userId) => {
      onlineUsers.set(userId, socket.id);
      socket.join(userId.toString());

      console.log("Online users:", onlineUsers);

      // send online users to everyone
      io?.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });

    // join conversation room
    socket.on("joinConversation", (conversationId) => {
      if (conversationId) {
        socket.join(conversationId.toString());
        console.log(`Joined room ${conversationId}`);
      }
    });

    // typing indicator
    socket.on("typing", (data) => {
      if (data?.conversationId) {
        socket.to(data.conversationId.toString()).emit("typing", {
          userId: Number(data.userId),
          conversationId: Number(data.conversationId),
        });
      }
    });

    // stop typing
    socket.on("stopTyping", (data) => {
      if (data?.conversationId) {
        socket.to(data.conversationId.toString()).emit("stopTyping", {
          userId: Number(data.userId),
          conversationId: Number(data.conversationId),
        });
      }
    });

    // disconnect
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);

      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }

      // update everyone
      io?.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });

    socket.on("messageseen", async (data) => {
      const { conversationId, userId } = data;

      await prisma.message.updateMany({
        where: {
          conversationId: Number(conversationId),
          SenderId: {
            not: userId,
          },
          isSeen: false,
        },
        data: {
          isSeen: true,
          seenAt: new Date(),
        },
      });
      socket.to(conversationId.toString()).emit("messageseen", {
        conversationId,
      });
    });

    socket.on("calluser", async (data) => {
      const { receiverId, offer, callerInfo, callId, type } = data;
      if (receiverId && io) {
        io.to(receiverId.toString()).emit("incomingcall", {
          offer,
          callerInfo,
          callId,
          type,
        });
      }

      setTimeout(() => {
        markCallMissedIfStillRinging(
          callId,
          callerInfo?.id ?? callerInfo?.Id
        ).catch((error) => {
          console.error("Failed to auto-mark missed socket call", error);
        });
      }, 30000);
    });

    socket.on("acceptcall", async (data) => {
      const { callId, answer, answercallerId } = data;

      if (answercallerId && io) {
        io.to(answercallerId.toString()).emit("callaccepted", {
          answer,
          callId,
        });
      }
      try {
        await prisma.call.update({
          where: { id: Number(callId) },
          data: { status: "accepted" },
        });
      } catch (e) {
        console.error("Failed to update call accepted", e);
      }
    });

    socket.on("ice-candidate", async (data) => {
      const { candidate, receiverId } = data;
      if (receiverId && io) {
        io.to(receiverId.toString()).emit("ice-candidate", {
          candidate,
          from: data.from,
        });
      }
    });

    socket.on("endcall", async (data) => {
      const { receiverId, callId } = data;
      if (receiverId && io) {
        io.to(receiverId.toString()).emit("callended", {
          callId,
        });
      }
      try {
        const existing = await prisma.call.findUnique({
          where: { id: Number(callId) },
        });
        if (existing) {
          await prisma.call.update({
            where: { id: Number(callId) },
            data: {
              status: "ended",
              endedAt: new Date(),
              duration: Math.floor(
                (new Date().getTime() - existing.createdAt.getTime()) / 1000
              ),
            },
          });
        }
      } catch (e) {
        console.error("Failed to update call end", e);
      }
    });

    socket.on("rejectcall", async (data) => {
      const { callerId, callId } = data;
      if (callerId && io) {
        io.to(callerId.toString()).emit("callrejected", {
          callId,
        });
      }
      try {
        await prisma.call.update({
          where: { id: Number(callId) },
          data: { status: "rejected", endedAt: new Date() },
        });
      } catch (e) {
        console.error("Failed to update call rejected", e);
      }
    });
  });
};

export { initSocketServer, io };
