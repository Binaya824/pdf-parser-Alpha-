import express from "express";

import { AppError } from "./libs/utils.js";
// import Clause from "./models/data.model";
// import { config } from "dotenv";
import { errorHandler } from "./middlewares/error.handler.js";
import fs from "fs";
import morgan from "morgan";
import pdfRoutes from "./routes/pdf.routes.js";
// import { upload } from "./libs";
import uploadRoutes from "./routes/upload.routes.js";
// import { sequelize } from "./libs/db";
import cors from "cors"
import setupWebSocketServer from "./routes/WebSocket.js";
// import Files from "./models/files.model.js";
import swaggerDocs from "./swagger.js";

// config();

export const app = express();

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors())

app.use(express.static("uploads"));
app.use(express.static('build'))


app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/pdf", pdfRoutes);

swaggerDocs(app, process.env.PORT);

app.all("*", (req, _res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} path on the server`, 404));
});

app.use(errorHandler);

// const { PORT } = process.env

export const { PORT } = process.env;

setupWebSocketServer(8082, app);
// export {PORT}

// export const { PORT, MONGO_URI } = process.env;
