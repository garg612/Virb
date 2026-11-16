import amqp, { type Channel, type ChannelModel } from "amqplib";
import {
  RABBITMQ_EXCHANGES,
  RABBITMQ_QUEUES,
  RABBITMQ_ROUTING_KEYS,
} from "./constants.js";

let connection: ChannelModel | null = null;
let channel: Channel | null = null;
let isConnected = false;
let isConnecting = false;

export const isRabbitMQConnected = (): boolean => isConnected && channel !== null;

export const getRabbitMQChannel = (): Channel | null => channel;

export const connectRabbitMQ = async (): Promise<boolean> => {
  if (isConnected && channel) return true;
  if (isConnecting) return false;

  const url = process.env.RABBITMQ_URL || "amqp://localhost:5672";
  isConnecting = true;

  try {
    console.log(`[RabbitMQ] Connecting to ${url}...`);
    connection = await amqp.connect(url);
    channel = await connection.createChannel();

    connection.on("error", (err) => {
      console.error("[RabbitMQ] Connection error:", err.message);
      isConnected = false;
      channel = null;
    });

    connection.on("close", () => {
      console.warn("[RabbitMQ] Connection closed. Attempting reconnect in 5s...");
      isConnected = false;
      channel = null;
      setTimeout(() => {
        connectRabbitMQ().catch(() => {});
      }, 5000);
    });

    // 1. Setup Chat Events (Topic Exchange & Socket Queue)
    await channel.assertExchange(RABBITMQ_EXCHANGES.CHAT_EVENTS, "topic", {
      durable: true,
    });
    await channel.assertQueue(RABBITMQ_QUEUES.CHAT_SOCKET_EVENTS, {
      durable: true,
    });
    await channel.bindQueue(
      RABBITMQ_QUEUES.CHAT_SOCKET_EVENTS,
      RABBITMQ_EXCHANGES.CHAT_EVENTS,
      "chat.event.#"
    );

    // 2. Setup Media Upload Queue
    await channel.assertQueue(RABBITMQ_QUEUES.MEDIA_UPLOAD, {
      durable: true,
    });

    // 3. Setup Dead Letter Exchange (DLX) for Call Timeout / Missed Call
    await channel.assertExchange(RABBITMQ_EXCHANGES.CALL_DLX, "direct", {
      durable: true,
    });
    await channel.assertQueue(RABBITMQ_QUEUES.CALL_MISSED, {
      durable: true,
    });
    await channel.bindQueue(
      RABBITMQ_QUEUES.CALL_MISSED,
      RABBITMQ_EXCHANGES.CALL_DLX,
      RABBITMQ_ROUTING_KEYS.CALL_MISSED
    );

    // Queue where messages wait with a TTL, then get dead-lettered to CALL_MISSED
    await channel.assertQueue(RABBITMQ_QUEUES.CALL_TIMEOUT_WAIT, {
      durable: true,
      deadLetterExchange: RABBITMQ_EXCHANGES.CALL_DLX,
      deadLetterRoutingKey: RABBITMQ_ROUTING_KEYS.CALL_MISSED,
    });

    isConnected = true;
    console.log("[RabbitMQ] Successfully connected and queues/exchanges initialized.");
    return true;
  } catch (error: any) {
    console.warn(
      `[RabbitMQ] Could not connect to RabbitMQ at ${url}: ${error.message}. Running with direct in-memory fallback.`
    );
    isConnected = false;
    channel = null;
    return false;
  } finally {
    isConnecting = false;
  }
};

export const closeRabbitMQ = async (): Promise<void> => {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    isConnected = false;
    console.log("[RabbitMQ] Disconnected cleanly.");
  } catch (err: any) {
    console.error("[RabbitMQ] Error while closing connection:", err.message);
  }
};

