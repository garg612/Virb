import prisma from "../db/prisma.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { io } from "../socket/socket.js";

const deletemessage = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { messageId } = req.params;

  const message = await prisma.message.findUnique({
    where: {
      id: Number(messageId),
    },
  });

  if (!message) {
    return res.status(400).json({ message: "Message not found" });
  }

  const senderId = (message as any).senderId ?? message.SenderId;
  if (senderId !== userId) {
    return res.status(402).json({
      message: "Can't delete others message",
    });
  }

  const deleted = await prisma.message.update({
    where: {
      id: Number(messageId),
    },
    data: {
      content: null,
      image: null,
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  io?.to(message.conversationId.toString()).emit("message deleted", {
    messageId: deleted.id,
  });

  return res.status(200).json({
    message: "message deleted successfully",
  });
});

const editmessage = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const messageId = req.params?.messageId || (req as any).prams?.messageId;
  const { content } = req.body;

  const message = await prisma.message.findUnique({
    where: {
      id: Number(messageId),
    },
  });

  if (!message) {
    return res.status(400).json({ message: "message not found" });
  }

  const senderId = (message as any).senderId ?? message.SenderId;
  if (senderId !== userId) {
    return res.status(402).json({ message: "cant edit others message" });
  }

  if (message.isDeleted) {
    return res.status(400).json({ message: "cant edit deleted message" });
  }

  const updatemessage = await prisma.message.update({
    where: {
      id: Number(messageId),
    },
    data: {
      content,
      isEdited: true,
      editedAt: new Date(),
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
        },
      },
      replyTo: {
        select: {
          id: true,
          content: true,
        },
      },
    },
  });

  io?.to(message.conversationId.toString()).emit("message edited", {
    message: updatemessage,
  });

  return res.status(200).json({
    message: "message edited successfully",
    data: updatemessage,
  });
});

export { deletemessage, editmessage };
