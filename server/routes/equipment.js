import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
import { getAllEquipment, createEquipment, updateEquipment, deleteEquipment } from "../controllers/equipmentController.js";

const router = Router();

// GET /equipment?loai=VAT_TU_TIEU_HAO|TAI_SU_DUNG&sort=ton_kho_asc|ton_kho_desc|ngay_nhap_asc|ngay_nhap_desc
router.get("/", authMiddleware, getAllEquipment);
router.post("/", authMiddleware, roleMiddleware("ADMIN", "NV_KHO"), createEquipment);
router.put("/:id", authMiddleware, roleMiddleware("ADMIN", "NV_KHO"), updateEquipment);
router.delete("/:id", authMiddleware, roleMiddleware("ADMIN"), deleteEquipment);

export default router;
