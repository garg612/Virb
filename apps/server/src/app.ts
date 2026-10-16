import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "./config/passport.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";

import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import callRoutes from "./routes/call.routes.js";

const app = express();
app.use(helmet());
app.use(morgan("dev"));
app.use(passport.initialize());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP",
});
app.use(limiter);
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(cookieParser());
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/calls", callRoutes);

export { app };
