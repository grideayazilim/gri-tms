import express from "express";
import { getTimesheets, createOrUpdateTimesheets, lockPeriod } from "../controllers/timesheetController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { scopeMiddleware } from "../middlewares/scopeMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, scopeMiddleware, getTimesheets);
router.post("/", authMiddleware, scopeMiddleware, createOrUpdateTimesheets);
router.patch("/:periodId/lock", authMiddleware, adminMiddleware, lockPeriod);

export default router;