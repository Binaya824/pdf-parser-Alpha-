import { Router } from "express";
import { handleUpload } from "../controllers/upload.controller.js";
import upload from "../libs/multer.js";
import multer from "multer";

const router = Router();

/**
 * @openapi
 * /:
 *   get:
 *     description: Welcome to swagger-jsdoc!
 *     responses:
 *       200:
 *         description: Returns a mysterious string.
 */
router.post("/", function name(req, res, next) {
    upload(req, res, function (err) {
        if (err?.code === "LIMIT_UNEXPECTED_FILE") {
            res.status(422).json({
                status: "failed",
                error: true,
                message: "Only a single file is allow to upload.",
            });
        } else if (err?.message === "ONLY_PDF_ALLOW_TO_UPLOAD") {
            res.status(415).json({
                status: "failed",
                error: true,
                message: "Only Pdf file is allow to upload.",
            });
        } else if (err instanceof multer.MulterError) {
            res.status(500).json({
                status: "failed",
                error: true,
                message: "Some thing went wrong in server.",
            });
        } else if (err) {
            if (err?.message === "ONLY_PDF_ALLOW_TO_UPLOAD") {
                res.status(415).json({
                    status: "failed",
                    error: true,
                    message: "Only Pdf file is allow to upload.",
                });
            } else {
                res.status(500).json({
                    status: "failed",
                    error: true,
                    message: "Some thing went wrong in server.",
                });
            }

        } else {
            next();
        }
    })
}, handleUpload);

export default router;
