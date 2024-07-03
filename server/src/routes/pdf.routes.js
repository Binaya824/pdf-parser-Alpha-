import { Router } from "express";
import { extractDataAndUploadToDB, extractDataAndUploadToDBApi, getPDFData, getSinglePdfData, updatePdfData } from "../controllers/pdf.controller.js";

const router = Router();

/**
 * @swagger
 * /:
 *   get:
 *     description: Welcome to swagger-jsdoc!
 *     responses:
 *       200:
 *         description: Returns a mysterious string.
 */
router.route("/").get(getPDFData).post(extractDataAndUploadToDBApi)
// router.route("/test").get(getTest)
router.route("/:id").get(getSinglePdfData).patch(updatePdfData)

// router.route("/test").get(getTest)
// router.route("/:id").get(getSinglePdfData)

export default router