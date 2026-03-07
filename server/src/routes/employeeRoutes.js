import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";
import { getEmployees } from "../controllers/employeeController.js";

const router = express.Router();

// Tüm employee route'ları: önce giriş kontrolü, sonra admin kontrolü
router.use(authMiddleware, adminMiddleware);

router.get("/", getEmployees);

export default router;
