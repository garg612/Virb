import prisma from "../db/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Apierror } from "../utils/Apierror.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import userValidate from "../validation/user.validation.js";
import { asyncHandler } from "../utils/asynchandler.js";

const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

const generateAccessAndRefreshToken = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new Apierror(404, "user not found");
  }

  const accessToken = jwt.sign(
    { id: user.id },
    process.env.ACCESS_TOKEN_SECRET!,
    {
      expiresIn: "1d",
    }
  );

  const refreshToken = jwt.sign({ id: user.id }, refreshTokenSecret!, {
    expiresIn: "7d",
  });

  await prisma.user.update({ where: { id: userId }, data: { refreshToken } });

  return { accessToken, refreshToken };
};

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, username, password } = req.body;
  const { error } = userValidate.validate(req.body);

  if (error) {
    return res.status(400).json({
      message: error.details[0].message,
    });
  }

  if (!email || !username) {
    return res.status(400).json({
      message: "Email and username are required",
    });
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });

  if (existingUser) {
    return res.status(400).json({
      message: "User with this email or username already exists",
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const avatarLocalPath = req.file?.path;
  const avatar1 = await uploadOnCloudinary(avatarLocalPath);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      username,
      avatar: avatar1?.url,
    },
  });
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user.id
  );

  const createdUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      avatar: true,
      accessToken: true,
    },
  });

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new Apiresponse(
        201,
        { user: createdUser, accessToken, refreshToken },
        "User registered successfully"
      )
    );
});

const refreshAccessToken = asyncHandler(async (req, res, next) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    return res.status(400).json({ message: "Refresh token required" });
  }

  const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET!
  ) as { id: number };

  const user = await prisma.user.findUnique({
    where: { id: decodedToken.id },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (incomingRefreshToken !== user.refreshToken) {
    return res.status(403).json({ message: "Invalid refresh token" });
  }

  const { accessToken, refreshToken: newRefreshToken } =
    await generateAccessAndRefreshToken(user.id);

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new Apiresponse(
        200,
        { accessToken, refreshToken: newRefreshToken },
        "Access token refreshed successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  res.clearCookie("accessToken", options);
  res.clearCookie("refreshToken", options);

  return res.status(200).json({
    message: "Logged out successfully",
  });
});

const changeAvatar = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // multer file
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    return res.status(400).json({
      message: "Avatar file is required",
    });
  }

  // upload to cloudinary
  const uploadedAvatar = await uploadOnCloudinary(avatarLocalPath);

  if (!uploadedAvatar) {
    return res.status(500).json({
      message: "Avatar upload failed",
    });
  }
  const user = await prisma.user.update({
    where: { id: userId },

    data: {
      avatar: uploadedAvatar.url,
    },

    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
    },
  });

  return res.status(200).json({
    message: "Avatar updated successfully",
    user,
  });
});

const getallUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  if (page < 1 || limit < 1) {
    return res.status(400).json({
      message: "Invalid page or limit values",
    });
  }

  const users = await prisma.user.findMany({
    take: limit,
    skip: skip,
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      avatar: true,
      publicKey: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalUsers = await prisma.user.count();
  const totalPages = Math.ceil(totalUsers / limit);

  return res.status(200).json({
    message: "Users retrieved successfully",
    pagination: {
      totalUsers,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    users,
  });
});

const updatePublicKey = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { publicKey } = req.body;

  if (!publicKey || typeof publicKey !== "string") {
    return res.status(400).json({
      message: "Valid public key string is required",
    });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { publicKey: publicKey.trim() },
    select: {
      id: true,
      name: true,
      username: true,
      publicKey: true,
    },
  });

  return res.status(200).json({
    message: "End-to-End Encryption public key saved successfully",
    user,
  });
});

export {
  registerUser,
  refreshAccessToken,
  logoutUser,
  changeAvatar,
  getallUsers,
  updatePublicKey,
};
