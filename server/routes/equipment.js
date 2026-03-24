import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
import { getAllEquipment, createEquipment, deactivateEquipment } from "../controllers/equipmentController.js";

const router = Router();

router.get("/", authMiddleware, getAllEquipment);
router.post("/", authMiddleware, roleMiddleware("ADMIN", "NV_KHO"), createEquipment);
router.put("/:id/deactivate", authMiddleware, roleMiddleware("ADMIN", "NV_KHO"), deactivateEquipment);

export default router;
