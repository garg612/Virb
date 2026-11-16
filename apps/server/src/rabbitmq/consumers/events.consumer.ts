import { getRabbitMQChannel, isRabbitMQConnected } from "../connection.js";
import { RABBITMQ_QUEUES } from "../constants.js";
import { io } from "../../socket/socket.js";
import type { ChatEventMessage } from "../types.js";

export const startChatEventsConsumer = async (): Promise<void> => {
  if (!isRabbitMQConnected()) return;
  const channel = getRabbitMQChannel();
  if (!channel) return;

  await channel.consume(
    RABBITMQ_QUEUES.CHAT_SOCKET_EVENTS,
    (msg) => {
      if (!msg) return;

      try {
        const payload: ChatEventMessage = JSON.parse(msg.content.toString());
        const { event, room, data } = payload;

        if (io && room) {
          io.to(room).emit(event, data);
        }

        channel.ack(msg);
      } catch (err: any) {
        console.error("[RabbitMQ] Error processing chat event from queue:", err.message);
        // Reject and don't requeue malformed messages
        channel.nack(msg, false, false);
      }
    },
    { noAck: false }
  );

  console.log("[RabbitMQ] Chat events consumer started.");
};

