import express from "express";
import { importEmployee, finalizeImport } from "../controllers/importController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// POST /api/import/employee — Tek çalışan içe aktar
router.post("/employee", authMiddleware, importEmployee);

// POST /api/import/finalize — İmport bittikten sonra audit log oluştur
router.post("/finalize", authMiddleware, finalizeImport);

export default router;
