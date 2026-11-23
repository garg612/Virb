import prisma from "../db/prisma.js";
import messageValidate from "../validation/message.validation.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { publishChatEvent, publishMediaUpload } from "../rabbitmq/index.js";

const createconversation = asyncHandler(async (req, res) => {
  const senderId = req.user.id;
  const { receiverId } = req.body;

  if (senderId === receiverId) {
    return res.status(400).json({
      message: "You cannot create a conversation with yourself",
    });
  }
  if (!receiverId) {
    return res.status(400).json({
      message: "Receiver id is required",
    });
  }
  const existingConversation = await prisma.conversation.findFirst({
    where: {
      isGroup: false,

      participants: {
        every: {
          id: {
            in: [senderId, receiverId],
          },
        },
        some: {
          id: {
            in: [senderId, receiverId],
          },
        },
      },
    },
    include: {
      participants: true,
    },
  });

  if (existingConversation) {
    return res.status(200).json({
      message: "Conversation already exists",
      conversation: existingConversation,
    });
  }

  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        connect: [{ id: senderId }, { id: receiverId }],
      },
      acceptedUserIds: [senderId], // sender is accepted; receiver has request
    },
    include: {
      participants: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
        },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  await publishChatEvent("conversationUpdated", receiverId.toString(), conversation);
  await publishChatEvent("conversationUpdated", senderId.toString(), conversation);

  return res.status(201).json({
    message: "Conversation created successfully",
    conversation,
  });
});

const createGroup = asyncHandler(async (req, res) => {
  const creatorId = req.user.id;
  const { name, participantIds, avatar } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      message: "Group name is required",
    });
  }

  if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
    return res.status(400).json({
      message: "At least one participant is required",
    });
  }

  // Ensure unique member IDs including creator
  const allMemberIds = Array.from(
    new Set([creatorId, ...participantIds.map((id: any) => Number(id))])
  );

  const group = await prisma.conversation.create({
    data: {
      isGroup: true,
      groupName: name.trim(),
      groupAvatar: avatar || null,
      groupAdminId: creatorId,
      participants: {
        connect: allMemberIds.map((id) => ({ id })),
      },
      acceptedUserIds: [creatorId], // creator is accepted; other participants have pending invitations
    },
    include: {
      participants: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
        },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  await Promise.all(
    allMemberIds.map((mId) =>
      publishChatEvent("conversationUpdated", mId.toString(), group)
    )
  );

  return res.status(201).json({
    message: "Group created successfully",
    group,
  });
});

const sendMessage = asyncHandler(async (req, res) => {
  const senderId = req.user.id;

  const { conversationId, content, replyToId } = req.body;

  const { error } = messageValidate.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  // validation
  if (!conversationId) {
    return res.status(400).json({
      message: "Conversation ID required",
    });
  }

  // empty message validation
  if (!content || content.trim() === "") {
    return res.status(400).json({
      message: "Message cannot be empty",
    });
  }

  // check conversation exists
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: Number(conversationId),
    },
    include: {
      participants: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  if (!conversation) {
    return res.status(404).json({
      message: "Conversation not found",
    });
  }

  // create message
  const message = await prisma.message.create({
    data: {
      content,

      sender: {
        connect: {
          id: senderId,
        },
      },

      conversation: {
        connect: {
          id: Number(conversationId),
        },
      },
      replyTo: replyToId
        ? {
            connect: {
              id: Number(replyToId),
            },
          }
        : undefined,
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

          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
  await publishChatEvent("newMessage", conversationId.toString(), message);

  // Broadcast conversationUpdated to all participants' individual rooms
  if (conversation && conversation.participants) {
    const updatedConversationPayload = {
      ...conversation,
      messages: [message],
      updatedAt: new Date().toISOString(),
    };
    await Promise.all(
      conversation.participants.map((p) =>
        publishChatEvent("conversationUpdated", p.id.toString(), updatedConversationPayload)
      )
    );
  }

  return res.status(201).json({
    message: "Message sent successfully",
    data: message,
  });
});

const getmessages = asyncHandler(async (req, res) => {
  const conversationId = req.params.conversationId;

  const messages = await prisma.message.findMany({
    where: {
      conversationId: Number(conversationId),
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
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  return res.status(200).json({
    message: "Messages retrieved successfully",
    messages,
  });
});

const getUserConversations = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: {
        some: {
          id: userId,
        },
      },
    },
    include: {
      participants: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
        },
      },
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
  return res.status(200).json({
    conversations,
  });
});

const addGroupmember = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { conversationId, newMemberId } = req.body;

  if (!conversationId || !newMemberId) {
    return res.status(400).json({
      message: "Conversation ID and new member ID are required",
    });
  }

  const group = await prisma.conversation.findUnique({
    where: {
      id: Number(conversationId),
    },
    include: {
      participants: true,
    },
  });

  if (!group || !group.isGroup) {
    return res.status(404).json({
      message: "Group conversation not found",
    });
  }

  if (group.groupAdminId !== userId) {
    return res.status(403).json({
      message: "Only group admin can add members",
    });
  }

  const alreadyMember = group.participants.some(
    (participant) => participant.id === newMemberId
  );

  if (alreadyMember) {
    return res.status(400).json({
      message: "User is already a member of the group",
    });
  }

  const updatedgroup = await prisma.conversation.update({
    where: {
      id: Number(conversationId),
    },

    data: {
      participants: {
        connect: {
          id: newMemberId,
        },
      },
    },
    include: {
      participants: true,
    },
  });

  await publishChatEvent("conversationUpdated", newMemberId.toString(), updatedgroup);
  await publishChatEvent("conversationUpdated", conversationId.toString(), updatedgroup);

  return res.status(200).json({
    message: "Member added successfully",
    group: updatedgroup,
  });
});

const removeGroupmember = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { conversationId, memberId } = req.body;

  if (!conversationId || !memberId) {
    return res.status(400).json({
      message: "Conversation ID and member ID are required",
    });
  }

  const group = await prisma.conversation.findUnique({
    where: {
      id: Number(conversationId),
    },
  });

  if (!group || !group.isGroup) {
    return res.status(404).json({
      message: "Group conversation not found",
    });
  }

  if (group.groupAdminId !== userId) {
    return res.status(403).json({
      message: "Only group admin can remove members",
    });
  }

  const updatedgroup = await prisma.conversation.update({
    where: {
      id: Number(conversationId),
    },

    data: {
      participants: {
        disconnect: {
          id: memberId,
        },
      },
    },
    include: {
      participants: true,
    },
  });

  await publishChatEvent("conversationRemoved", memberId.toString(), {
    conversationId: Number(conversationId),
  });
  await publishChatEvent("conversationUpdated", conversationId.toString(), updatedgroup);

  return res.status(200).json({
    message: "Member removed successfully",
    group: updatedgroup,
  });
});

const leaveGroup = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.body;

  if (!conversationId) {
    return res.status(400).json({
      message: "Conversation ID is required",
    });
  }

  const group = await prisma.conversation.findUnique({
    where: {
      id: Number(conversationId),
    },
  });

  if (!group || !group.isGroup) {
    return res.status(404).json({
      message: "Group conversation not found",
    });
  }

  const updatedgroup = await prisma.conversation.update({
    where: {
      id: Number(conversationId),
    },
    data: {
      participants: {
        disconnect: {
          id: Number(userId),
        },
      },
    },
  });

  return res.status(200).json({
    message: "Left group successfully",
    group: updatedgroup,
  });
});

const renamegroup = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const { conversationId, newName } = req.body;

  if (!conversationId || !newName) {
    return res.status(400).json({
      message: "Conversation ID and new name are required",
    });
  }

  const group = await prisma.conversation.findUnique({
    where: {
      id: Number(conversationId),
    },
  });

  if (!group || !group.isGroup) {
    return res.status(404).json({
      message: "Group conversation not found",
    });
  }

  if (group.groupAdminId !== userId) {
    return res.status(403).json({
      message: "Only group admin can rename the group",
    });
  }

  const updatedgroup = await prisma.conversation.update({
    where: {
      id: Number(conversationId),
    },
    data: {
      groupName: newName,
    },
  });

  return res.status(200).json({
    message: "Group renamed successfully",
    group: updatedgroup,
  });
});

const changeAvatar = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.body;

  const filelocalpath = req.file?.path;

  if (!filelocalpath) {
    return res.status(400).json({
      message: "avatar file required",
    });
  }

  if (!conversationId) {
    return res.status(400).json({
      message: "Conversation ID is required",
    });
  }

  const group = await prisma.conversation.findUnique({
    where: {
      id: Number(conversationId),
    },
  });

  if (!group || !group.isGroup) {
    return res.status(404).json({
      message: "Group conversation not found",
    });
  }

  if (group.groupAdminId !== userId) {
    return res.status(403).json({
      message: "Only group admin can change the avatar",
    });
  }

  const queued = publishMediaUpload({
    type: "GROUP_AVATAR",
    targetId: Number(conversationId),
    filePath: filelocalpath,
    userId,
  });

  if (queued) {
    return res.status(202).json({
      message: "Group avatar upload queued for background processing",
      status: "queued",
    });
  }

  // Fallback to synchronous upload if RabbitMQ is offline
  const uploadimage = await uploadOnCloudinary(filelocalpath);

  if (!uploadimage) {
    return res.status(500).json({
      message: "Failed to upload image",
    });
  }

  const updatedGroup = await prisma.conversation.update({
    where: {
      id: Number(conversationId),
    },
    data: {
      groupAvatar: uploadimage.url,
    },
  });

  await publishChatEvent("conversationUpdated", conversationId.toString(), updatedGroup);

  return res.status(200).json({
    message: "Group avatar updated",
    group: updatedGroup,
  });
});

const acceptConversationRequest = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.body;

  if (!conversationId) {
    return res.status(400).json({
      message: "Conversation ID is required",
    });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: Number(conversationId) },
    include: {
      participants: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  if (!conversation) {
    return res.status(404).json({
      message: "Conversation not found",
    });
  }

  const isParticipant = conversation.participants.some((p) => p.id === userId);
  if (!isParticipant) {
    return res.status(403).json({
      message: "You are not a participant in this conversation",
    });
  }

  const currentAccepted = conversation.acceptedUserIds || [];
  const updatedAccepted = Array.from(new Set([...currentAccepted, userId]));

  const updated = await prisma.conversation.update({
    where: { id: Number(conversationId) },
    data: {
      acceptedUserIds: updatedAccepted,
    },
    include: {
      participants: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
        },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  await publishChatEvent("conversationUpdated", userId.toString(), updated);
  await publishChatEvent("conversationUpdated", conversationId.toString(), updated);

  return res.status(200).json({
    message: "Request accepted successfully",
    conversation: updated,
  });
});

const rejectConversationRequest = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.body;

  if (!conversationId) {
    return res.status(400).json({
      message: "Conversation ID is required",
    });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: Number(conversationId) },
    include: { participants: true },
  });

  if (!conversation) {
    return res.status(404).json({
      message: "Conversation not found",
    });
  }

  const isParticipant = conversation.participants.some((p) => p.id === userId);
  if (!isParticipant) {
    return res.status(403).json({
      message: "You are not a participant in this conversation",
    });
  }

  if (conversation.isGroup) {
    // If it's a group: disconnect the user from participants and remove from acceptedUserIds
    const updated = await prisma.conversation.update({
      where: { id: Number(conversationId) },
      data: {
        participants: {
          disconnect: { id: userId },
        },
        acceptedUserIds: (conversation.acceptedUserIds || []).filter((id) => id !== userId),
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    await publishChatEvent("conversationRemoved", userId.toString(), {
      conversationId: Number(conversationId),
    });
    await publishChatEvent("conversationUpdated", conversationId.toString(), updated);

    return res.status(200).json({
      message: "Group invitation rejected and removed from group",
      conversation: updated,
    });
  } else {
    // Direct chat: delete the conversation
    await prisma.conversation.delete({
      where: { id: Number(conversationId) },
    });

    await Promise.all(
      conversation.participants.map((p) =>
        publishChatEvent("conversationRemoved", p.id.toString(), {
          conversationId: Number(conversationId),
        })
      )
    );

    return res.status(200).json({
      message: "Conversation request rejected and deleted",
    });
  }
});

export {
  createconversation,
  createGroup,
  acceptConversationRequest,
  rejectConversationRequest,
  getmessages,
  sendMessage,
  getUserConversations,
  addGroupmember,
  removeGroupmember,
  leaveGroup,
  renamegroup,
  changeAvatar,
};
