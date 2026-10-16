import jwt, { JwtPayload } from "jsonwebtoken";
import { Apierror } from "../utils/Apierror.js";
import prisma from "../db/prisma.js";
import { asyncHandler } from "../utils/asynchandler.js";

interface DecodedToken extends JwtPayload {
  id: number;
}

export const verifyJWT = asyncHandler(async (req, _, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  console.log("Token: ", token);

  if (!token) {
    return next(new Apierror(401, "No token provided"));
  }

  try {
    const decodedtoken = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET!
    ) as DecodedToken;

    const user = await prisma.user.findUnique({
      where: {
        id: decodedtoken.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return next(new Apierror(403, "Forbidden"));
    }

    req.user = user as any;
    next();
  } catch (error) {
    return next(new Apierror(401, "Invalid token"));
  }
});
