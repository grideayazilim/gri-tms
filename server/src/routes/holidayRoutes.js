import express from "express";
import { getPublicHolidays } from "../controllers/holidayController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getPublicHolidays);

export default router;
