import { getRabbitMQChannel, isRabbitMQConnected } from "../connection.js";
import { RABBITMQ_QUEUES } from "../constants.js";
import { markCallMissedIfStillRinging } from "../../utils/call-status.js";
import type { CallTimeoutMessage } from "../types.js";

export const startCallTimeoutConsumer = async (): Promise<void> => {
  if (!isRabbitMQConnected()) return;
  const channel = getRabbitMQChannel();
  if (!channel) return;

  await channel.consume(
    RABBITMQ_QUEUES.CALL_MISSED,
    async (msg) => {
      if (!msg) return;

      try {
        const payload: CallTimeoutMessage = JSON.parse(msg.content.toString());
        const { callId, callerId } = payload;

        console.log(`[RabbitMQ DLX] Processing missed call check for call ${callId}`);
        await markCallMissedIfStillRinging(callId, callerId);

        channel.ack(msg);
      } catch (err: any) {
        console.error("[RabbitMQ] Error processing missed call timeout:", err.message);
        channel.nack(msg, false, false);
      }
    },
    { noAck: false }
  );

  console.log("[RabbitMQ] Call timeout DLX consumer started.");
};

