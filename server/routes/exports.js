import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
import { getAllExports, createExport, confirmExport } from "../controllers/exportController.js";

const router = Router();

router.get("/", authMiddleware, getAllExports);
router.post("/", authMiddleware, roleMiddleware("ADMIN", "NV_KHO"), createExport);
router.put("/:id/confirm", authMiddleware, roleMiddleware("ADMIN", "NV_KHO"), confirmExport);

export default router;
