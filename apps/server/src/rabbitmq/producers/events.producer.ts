import { getRabbitMQChannel, isRabbitMQConnected } from "../connection.js";
import { RABBITMQ_EXCHANGES } from "../constants.js";
import { io } from "../../socket/socket.js";
import type { ChatEventMessage } from "../types.js";

/**
 * Publishes a real-time event to the RabbitMQ topic exchange.
 * If RabbitMQ is not available, falls back to direct Socket.IO emission.
 */
export const publishChatEvent = async (
  event: string,
  room: string,
  data: any
): Promise<boolean> => {
  const payload: ChatEventMessage = { event, room, data };

  if (isRabbitMQConnected()) {
    try {
      const channel = getRabbitMQChannel();
      if (channel) {
        const sanitizedEvent = event.replace(/\s+/g, "_");
        const routingKey = `chat.event.${sanitizedEvent}`;
        channel.publish(
          RABBITMQ_EXCHANGES.CHAT_EVENTS,
          routingKey,
          Buffer.from(JSON.stringify(payload)),
          { persistent: true }
        );
        return true;
      }
    } catch (err: any) {
      console.error("[RabbitMQ] Failed to publish chat event, falling back to direct emit:", err.message);
    }
  }

  // Graceful fallback to direct Socket.io emit
  if (io) {
    io.to(room).emit(event, data);
  }
  return false;
};

