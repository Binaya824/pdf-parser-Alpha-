// import {
//   ValidationError as SequelizeValidationError,
//   UniqueConstraintError,
// } from "sequelize";

import { AppError } from "../libs/utils.js";

const sendDevError = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    err: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendProdError = (err, res) => {
  err.isOperational
    ? res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    })
    : res.status(500).json({
      status: "error",
      message: "Something went wrong, please try again later!",
    });
};

const handleSequelizeValidationError = (
  err
) => {
  const errors = err.errors.map((error) => error.message);
  const message = `Invalid input data: ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const handleUniqueConstraintError = (err) => {
  const fields = err.fields // Explicitly check if fields is defined
  const joinedFields = fields.join(", ");
  const message = `Duplicate field value(s) in ${joinedFields}, please try again with different value(s)`;
  return new AppError(message, 400);
};

const errorHandler = (
  err,
  _req,
  res,
  _next
) => {
  err.statusCode = +err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendDevError(err, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err };
    if (error instanceof SequelizeValidationError) {
      error = handleSequelizeValidationError(error);
    } else if (error instanceof UniqueConstraintError) {
      error = handleUniqueConstraintError(error);
    }
    sendProdError(error, res);
  }
};

export  {errorHandler}
