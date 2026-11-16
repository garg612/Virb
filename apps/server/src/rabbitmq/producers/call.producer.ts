import { getRabbitMQChannel, isRabbitMQConnected } from "../connection.js";
import { RABBITMQ_QUEUES } from "../constants.js";
import type { CallTimeoutMessage } from "../types.js";

/**
 * Publishes a call timeout job to RabbitMQ with a TTL (expiration).
 * Once the TTL expires, RabbitMQ moves the message to the DLX queue (CALL_MISSED).
 * Returns true if queued, false if RabbitMQ is not available.
 */
export const publishDelayedCallTimeout = (
  callId: number | string,
  callerId?: number | string | null,
  delayMs: number = 30000
): boolean => {
  if (!isRabbitMQConnected()) {
    return false;
  }

  try {
    const channel = getRabbitMQChannel();
    if (!channel) return false;

    const payload: CallTimeoutMessage = { callId, callerId };
    channel.sendToQueue(
      RABBITMQ_QUEUES.CALL_TIMEOUT_WAIT,
      Buffer.from(JSON.stringify(payload)),
      {
        expiration: String(delayMs),
        persistent: true,
      }
    );
    console.log(`[RabbitMQ] Delayed timeout of ${delayMs}ms scheduled for call ${callId}`);
    return true;
  } catch (err: any) {
    console.error("[RabbitMQ] Failed to schedule call timeout:", err.message);
    return false;
  }
};

