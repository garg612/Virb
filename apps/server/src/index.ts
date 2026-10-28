import "dotenv/config";
import http from "http";
import { initSocketServer } from "./socket/socket.js";
import { app } from "./app.js";
import { connectDB } from "./db/index.js";

console.log(process.env.DATABASE_URL);

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

initSocketServer(server);

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("Error connecting to database: ", err);
    process.exit(1);
  });
