import express from "express";
import { getLocations, getUnitsByLocation } from "../controllers/locationAndUnitController.js";

const router = express.Router();

router.get("/locations", getLocations);
router.get("/locations/:locationId/units", getUnitsByLocation);

export default router;