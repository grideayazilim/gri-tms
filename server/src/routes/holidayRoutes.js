import express from "express";
import { getPublicHolidays } from "../controllers/holidayController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.js";
import { holidayQuerySchema } from "@timesheet/shared";

const router = express.Router();

router.get("/", authMiddleware, validate(holidayQuerySchema, 'query'), getPublicHolidays);

export default router;
