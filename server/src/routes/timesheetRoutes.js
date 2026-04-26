import express from "express";
import {
  getTimesheets,
  createOrUpdateTimesheets,
  toggleLockPeriod,
  getPeriods,
} from "../controllers/timesheetController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { scopeMiddleware } from "../middlewares/scopeMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";
import { validate } from "../middlewares/validate.js";
import { timesheetSaveSchema } from "@timesheet/shared";

const router = express.Router();

router.get("/periods", authMiddleware, getPeriods);
router.get("/", authMiddleware, scopeMiddleware, getTimesheets);
router.post("/", authMiddleware, scopeMiddleware, validate(timesheetSaveSchema), createOrUpdateTimesheets);
router.patch("/:periodId/lock", authMiddleware, adminMiddleware, toggleLockPeriod);

export default router;
