import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
import { getAllExports, exportToExcel, createExportManual } from "../controllers/exportController.js";

const router = Router();

// Lấy lịch sử xuất kho
router.get("/", authMiddleware, getAllExports);

// Xuất lịch sử ra file Excel
router.get("/excel", authMiddleware, exportToExcel);

// Tạo phiếu xuất kho thủ công qua form UI
router.post("/", authMiddleware, roleMiddleware("ADMIN", "NV_KHO"), createExportManual);

export default router;
