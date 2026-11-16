import { connectRabbitMQ, closeRabbitMQ, isRabbitMQConnected } from "./connection.js";
import { startChatEventsConsumer } from "./consumers/events.consumer.js";
import { startCallTimeoutConsumer } from "./consumers/call.consumer.js";
import { startMediaUploadConsumer } from "./consumers/media.consumer.js";

export * from "./types.js";
export * from "./constants.js";
export * from "./connection.js";
export * from "./producers/events.producer.js";
export * from "./producers/call.producer.js";
export * from "./producers/media.producer.js";

export const initRabbitMQ = async (): Promise<boolean> => {
  const connected = await connectRabbitMQ();
  if (connected) {
    try {
      await startChatEventsConsumer();
      await startCallTimeoutConsumer();
      await startMediaUploadConsumer();
      console.log("[RabbitMQ] All consumers successfully initialized and listening.");
    } catch (err: any) {
      console.error("[RabbitMQ] Error starting consumers:", err.message);
    }
  }
  return connected;
};

