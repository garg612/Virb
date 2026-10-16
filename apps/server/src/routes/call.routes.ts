import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  startcall,
  acceptcall,
  endcall,
  rejectcall,
  getcallhistory,
} from "../controllers/call.controller.js";

const router = Router();

router.post("/start", verifyJWT, startcall);
router.patch("/accept/:callId", verifyJWT, acceptcall);
router.patch("/end/:callId", verifyJWT, endcall);
router.patch("/reject/:callId", verifyJWT, rejectcall);
router.get("/history", verifyJWT, getcallhistory);

export default router;
