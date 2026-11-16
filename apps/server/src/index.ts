import "dotenv/config";
import http from "http";
import { initSocketServer } from "./socket/socket.js";
import { app } from "./app.js";
import { connectDB } from "./db/index.js";
import { initRabbitMQ, closeRabbitMQ } from "./rabbitmq/index.js";

console.log(process.env.DATABASE_URL);

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

initSocketServer(server);

connectDB()
  .then(async () => {
    // Initialize RabbitMQ broker and consumers
    await initRabbitMQ().catch((err) => {
      console.warn("[RabbitMQ] Startup warning:", err.message);
    });

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("Error connecting to database: ", err);
    process.exit(1);
  });

const handleShutdown = async () => {
  console.log("Shutting down gracefully...");
  await closeRabbitMQ();
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGTERM", handleShutdown);
process.on("SIGINT", handleShutdown);
