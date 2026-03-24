import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getAllInventory } from "../controllers/inventoryController.js";

const router = Router();

router.get("/", authMiddleware, getAllInventory);

export default router;
