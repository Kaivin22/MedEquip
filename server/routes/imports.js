import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
import { getAllImports, createImport, approveImport, deleteImport } from "../controllers/importController.js";

const router = Router();

router.get("/", authMiddleware, getAllImports);
router.post("/", authMiddleware, roleMiddleware("ADMIN", "NV_KHO"), createImport);
// Trưởng khoa hoặc Admin mới được duyệt phiếu nhập kho
router.put("/:id/approve", authMiddleware, roleMiddleware("ADMIN", "TRUONG_KHOA"), approveImport);
router.delete("/:id", authMiddleware, roleMiddleware("ADMIN"), deleteImport);

export default router;
