import express from "express";
import {
  exportPuantaj,
  exportSimple,
  exportBot,
} from "../controllers/exportController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET /api/export/puantaj
router.get("/puantaj", authMiddleware, exportPuantaj);

// GET /api/export/simple
router.get("/simple", authMiddleware, exportSimple);

// GET /api/export/bot
router.get("/bot", authMiddleware, exportBot);

export default router;
