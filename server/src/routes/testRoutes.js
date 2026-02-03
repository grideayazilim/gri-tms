import express from "express";
import { testDbController } from "../controllers/testController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = express.Router();

router.get("/db-test", requireAuth, testDbController);

export default router;