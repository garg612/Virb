import { Router } from "express";
import {
  registerUser,
  refreshAccessToken,
  logoutUser,
  changeAvatar,
  getallUsers,
  updatePublicKey,
} from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";

const router = Router();

router.post("/register", upload.single("avatar"), registerUser);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", verifyJWT, logoutUser);
router.post("/change-avatar", verifyJWT, upload.single("avatar"), changeAvatar);
router.put("/public-key", verifyJWT, updatePublicKey);
router.get("/all", getallUsers);

export default router;
