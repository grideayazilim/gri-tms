import express from "express";
import { importEmployee, finalizeImport, bulkImportEmployees } from "../controllers/importController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.js";
import { importEmployeeSchema, importFinalizeSchema } from "@timesheet/shared";

const router = express.Router();

router.post("/employee", authMiddleware, validate(importEmployeeSchema), importEmployee);
router.post("/bulk-employees", authMiddleware, bulkImportEmployees);
router.post("/finalize", authMiddleware, validate(importFinalizeSchema), finalizeImport);

export default router;
