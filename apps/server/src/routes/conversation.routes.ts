import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";
import {
  deletemessage,
  editmessage,
} from "../controllers/message.controller.js";
import {
  createconversation,
  createGroup,
  acceptConversationRequest,
  rejectConversationRequest,
  getmessages,
  sendMessage,
  getUserConversations,
  addGroupmember,
  removeGroupmember,
  leaveGroup,
  renamegroup,
  changeAvatar,
} from "../controllers/conversation.controller.js";

const router = Router();

router.post("/create", verifyJWT, createconversation);
router.post("/create-group", verifyJWT, createGroup);
router.post("/accept-request", verifyJWT, acceptConversationRequest);
router.post("/reject-request", verifyJWT, rejectConversationRequest);
router.get("/messages/:conversationId", verifyJWT, getmessages);
router.post("/send-message", verifyJWT, sendMessage);
router.get("/my-conversations", verifyJWT, getUserConversations);
router.post("/add-member", verifyJWT, addGroupmember);
router.post("/remove-member", verifyJWT, removeGroupmember);
router.post("/leave-group", verifyJWT, leaveGroup);
router.patch("/update-name", verifyJWT, renamegroup);
router.patch("/update-avatar", verifyJWT, upload.single("avatar"), changeAvatar);
router.delete("/messagedelete/:messageId", verifyJWT, deletemessage);
router.patch("/messageedit/:messageId", verifyJWT, editmessage);

export default router;
