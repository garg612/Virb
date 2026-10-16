import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Apierror } from "../utils/Apierror.js";

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = err;
  if (!(error instanceof Apierror)) {
    const statusCode =
      error.statusCode || error instanceof mongoose.Error ? 400 : 500;
    const message = error.message || "Something went wrong";
    error = new Apierror(statusCode, message, error?.errors || [], err.stack);
  }
  const response = {
    ...error,
    message: error.message,
    ...(process.env.NODE_ENV === "production" ? { stack: error.stack } : {}),
  };
  return res.status(error.statusCode).json(response);
};

export { errorHandler };
