import express from "express";
import {
  exportTimesheet,
  exportSimple,
  exportBot,
} from "../controllers/exportController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.js";
import { exportQuerySchema } from "@timesheet/shared";

const router = express.Router();

const validateExportQuery = validate(exportQuerySchema, 'query');

router.get("/timesheet", authMiddleware, validateExportQuery, exportTimesheet);
router.get("/simple", authMiddleware, validateExportQuery, exportSimple);
router.get("/bot", authMiddleware, validateExportQuery, exportBot);

export default router;
