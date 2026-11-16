export const RABBITMQ_EXCHANGES = {
  CHAT_EVENTS: "chat.events.topic",
  CALL_DLX: "call.timeout.dlx",
} as const;

export const RABBITMQ_QUEUES = {
  CHAT_SOCKET_EVENTS: "chat.events.socket.queue",
  MEDIA_UPLOAD: "media.upload.queue",
  CALL_TIMEOUT_WAIT: "call.timeout.wait.queue",
  CALL_MISSED: "call.missed.queue",
} as const;

export const RABBITMQ_ROUTING_KEYS = {
  CHAT_EVENT_ALL: "chat.event.*",
  CALL_MISSED: "call.missed",
} as const;

