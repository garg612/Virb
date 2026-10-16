import prisma from "../db/prisma.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { markCallMissedIfStillRinging } from "../utils/call-status.js";

const startcall = asyncHandler(async (req, res) => {
  const callerId = req.user.id;
  const { receiverId, type } = req.body;

  if (callerId === receiverId) {
    return res.status(400).json({
      message: "Can't call yourself",
    });
  }

  if (!type || (type !== "audio" && type !== "video")) {
    return res.status(400).json({
      message: "Invalid call type",
    });
  }

  if (!type || !receiverId) {
    return res.status(400).json({
      message: "Missing required fields",
    });
  }

  const call = await prisma.call.create({
    data: {
      caller: {
        connect: {
          id: callerId,
        },
      },
      receiver: {
        connect: {
          id: receiverId,
        },
      },
      type,
      status: "ringing",
    },
    include: {
      caller: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
      receiver: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
  });

  setTimeout(() => {
    markCallMissedIfStillRinging(call.id, callerId).catch((error) => {
      console.error("Failed to auto-mark missed call", error);
    });
  }, 30000);

  return res.status(200).json({
    message: "Call initiated successfully",
    call,
  });
});

const acceptcall = asyncHandler(async (req, res) => {
  const { callId } = req.params;

  if (!callId) {
    return res.status(400).json({
      message: "Missing callId",
    });
  }

  const call = await prisma.call.update({
    where: {
      id: Number(callId),
    },
    data: {
      status: "accepted",
    },
  });

  return res.status(200).json({
    message: "Call accepted successfully",
    call,
  });
});

const endcall = asyncHandler(async (req, res) => {
  const { callId } = req.params;

  if (!callId) {
    return res.status(400).json({
      message: "Missing callId",
    });
  }

  const existingCall = await prisma.call.findUnique({
    where: { id: Number(callId) },
  });
  if (!existingCall) {
    return res.status(404).json({ message: "Call not found" });
  }

  const duration = Math.floor(
    (new Date().getTime() - existingCall.createdAt.getTime()) / 1000
  );

  const call = await prisma.call.update({
    where: {
      id: Number(callId),
    },
    data: {
      status: "ended",
      endedAt: new Date(),
      duration,
    },
  });

  return res.status(200).json({
    message: "Call ended successfully",
    call,
  });
});

const rejectcall = asyncHandler(async (req, res) => {
  const { callId } = req.params;

  if (!callId) {
    return res.status(400).json({
      message: "Missing callId",
    });
  }

  const call = await prisma.call.update({
    where: {
      id: Number(callId),
    },
    data: {
      status: "rejected",
    },
  });

  return res.status(200).json({
    message: "Call rejected successfully",
    call,
  });
});

const getcallhistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const calls = await prisma.call.findMany({
    where: {
      OR: [{ callerId: userId }, { receiverId: userId }],
    },
    include: {
      caller: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
      receiver: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res.status(200).json({
    meessage: "Call history retrieved successfully",
    calls,
  });
});

export { startcall, acceptcall, endcall, rejectcall, getcallhistory };
