import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
import { getAllAllocations, createAllocation } from "../controllers/allocationController.js";

const router = Router();

router.get("/", authMiddleware, getAllAllocations);
router.post("/", authMiddleware, roleMiddleware("ADMIN", "NV_KHO"), createAllocation);

export default router;
