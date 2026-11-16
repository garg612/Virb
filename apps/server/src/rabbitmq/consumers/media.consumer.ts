import { getRabbitMQChannel, isRabbitMQConnected } from "../connection.js";
import { RABBITMQ_QUEUES } from "../constants.js";
import { uploadOnCloudinary } from "../../utils/cloudinary.js";
import prisma from "../../db/prisma.js";
import { io } from "../../socket/socket.js";
import type { MediaUploadJob } from "../types.js";

export const startMediaUploadConsumer = async (): Promise<void> => {
  if (!isRabbitMQConnected()) return;
  const channel = getRabbitMQChannel();
  if (!channel) return;

  // Process one media upload at a time to prevent resource exhaustion
  channel.prefetch(2);

  await channel.consume(
    RABBITMQ_QUEUES.MEDIA_UPLOAD,
    async (msg) => {
      if (!msg) return;

      try {
        const job: MediaUploadJob = JSON.parse(msg.content.toString());
        console.log(`[RabbitMQ] Processing media upload job for ${job.type} targetId=${job.targetId}`);

        const uploaded = await uploadOnCloudinary(job.filePath);
        if (!uploaded) {
          console.error(`[RabbitMQ] Cloudinary upload returned null for ${job.filePath}`);
          channel.ack(msg);
          return;
        }

        if (job.type === "GROUP_AVATAR") {
          const updatedGroup = await prisma.conversation.update({
            where: { id: Number(job.targetId) },
            data: { groupAvatar: uploaded.url },
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

          if (io) {
            io.to(job.targetId.toString()).emit("conversationUpdated", updatedGroup);
          }
        } else if (job.type === "USER_AVATAR") {
          await prisma.user.update({
            where: { id: Number(job.targetId) },
            data: { avatar: uploaded.url },
          });

          if (io) {
            io.to(job.targetId.toString()).emit("userAvatarUpdated", {
              userId: job.targetId,
              avatar: uploaded.url,
            });
          }
        }

        channel.ack(msg);
        console.log(`[RabbitMQ] Media upload job completed for target ${job.targetId}`);
      } catch (err: any) {
        console.error("[RabbitMQ] Error processing media upload job:", err.message);
        // Do not requeue corrupted or failed uploads indefinitely
        channel.nack(msg, false, false);
      }
    },
    { noAck: false }
  );

  console.log("[RabbitMQ] Media upload consumer started.");
};

