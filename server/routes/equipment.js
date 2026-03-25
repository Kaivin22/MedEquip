import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
import { getAllEquipment, createEquipment, updateEquipment, deleteEquipment } from "../controllers/equipmentController.js";

const router = Router();

router.get("/", authMiddleware, getAllEquipment);
router.post("/", authMiddleware, roleMiddleware("ADMIN"), createEquipment);
router.put("/:id", authMiddleware, roleMiddleware("ADMIN"), updateEquipment);
router.delete("/:id", authMiddleware, roleMiddleware("ADMIN"), deleteEquipment);

export default router;
