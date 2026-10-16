import { Router, Request, Response } from "express";
import passport from "../config/passport.js";
import jwt from "jsonwebtoken";

const router = Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    const token = jwt.sign(
      { id: user.id },
      process.env.ACCESS_TOKEN_SECRET!,
      { expiresIn: "1d" }
    );

    return res.json({
      token,
      message: "Google authentication successful",
      user: req.user,
    });
  }
);

export default router;
