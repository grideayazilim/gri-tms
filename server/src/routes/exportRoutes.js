import express from "express";
import {
  exportTimesheet,
  exportSimple,
  exportBot,
} from "../controllers/exportController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET /api/export/timesheet
router.get("/timesheet", authMiddleware, exportTimesheet);

// GET /api/export/simple
router.get("/simple", authMiddleware, exportSimple);

// GET /api/export/bot
router.get("/bot", authMiddleware, exportBot);

export default router;
