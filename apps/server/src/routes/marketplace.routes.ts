import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  createRequirement,
  getMyRequirements,
  deleteRequirement,
  searchRequirements,
  startChatWithSeller,
  payForRequirement,
} from "../controllers/marketplace.controller.js";

const router = Router();

// Seller requirement routes (hidden by default)
router.post("/requirements", verifyJWT, createRequirement);
router.get("/my-requirements", verifyJWT, getMyRequirements);
router.delete("/requirements/:id", verifyJWT, deleteRequirement);

// Buyer discovery & purchase routes
router.get("/search", verifyJWT, searchRequirements);
router.post("/start-chat", verifyJWT, startChatWithSeller);
router.post("/pay", verifyJWT, payForRequirement);

export default router;

