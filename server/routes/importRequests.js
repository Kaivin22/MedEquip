import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
import { getAllImportRequests, createImportRequest, approveImportRequest } from "../controllers/importRequestController.js";

const router = Router();

// Lấy danh sách (bất kỳ ai đã đăng nhập hoặc filter theo yêu cầu)
router.get("/", authMiddleware, getAllImportRequests);

// NV Kho tạo yêu cầu nhập thiết bị mới
router.post("/", authMiddleware, roleMiddleware("NV_KHO", "ADMIN", "TRUONG_KHOA"), createImportRequest);

// Trưởng khoa duyệt
router.put("/:id/approve", authMiddleware, roleMiddleware("TRUONG_KHOA", "ADMIN"), approveImportRequest);

export default router;
