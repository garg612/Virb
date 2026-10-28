import prisma from "../db/prisma.js";
import { io } from "../socket/socket.js";

export const markCallMissedIfStillRinging = async (
  callId: number | string,
  callerId?: number | string | null
): Promise<void> => {
  const call = await prisma.call.findUnique({
    where: { id: Number(callId) },
  });

  if (call && call.status === "ringing") {
    await prisma.call.update({
      where: { id: Number(callId) },
      data: {
        status: "missed",
        endedAt: new Date(),
      },
    });

    if (io && callerId) {
      io.to(String(callerId)).emit("callmissed", { callId });
    }
  }
};
