import { getRabbitMQChannel, isRabbitMQConnected } from "../connection.js";
import { RABBITMQ_QUEUES } from "../constants.js";
import type { MediaUploadJob } from "../types.js";

/**
 * Publishes an asynchronous media upload job to RabbitMQ.
 */
export const publishMediaUpload = (job: MediaUploadJob): boolean => {
  if (!isRabbitMQConnected()) {
    return false;
  }

  try {
    const channel = getRabbitMQChannel();
    if (!channel) return false;

    channel.sendToQueue(
      RABBITMQ_QUEUES.MEDIA_UPLOAD,
      Buffer.from(JSON.stringify(job)),
      { persistent: true }
    );
    console.log(`[RabbitMQ] Media upload queued for ${job.type} targetId=${job.targetId}`);
    return true;
  } catch (err: any) {
    console.error("[RabbitMQ] Failed to queue media upload:", err.message);
    return false;
  }
};

