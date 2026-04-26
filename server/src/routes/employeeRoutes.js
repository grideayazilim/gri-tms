import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../controllers/employeeController.js";
import { validate } from "../middlewares/validate.js";
import { employeeSchema } from "@timesheet/shared";

const router = express.Router();

// Tüm employee route'ları: önce giriş kontrolü, sonra admin kontrolü
router.use(authMiddleware, adminMiddleware);

router.get("/", getEmployees);
router.post("/", validate(employeeSchema), createEmployee);
router.put("/:id", validate(employeeSchema), updateEmployee);
router.delete("/:id", deleteEmployee);

export default router;
