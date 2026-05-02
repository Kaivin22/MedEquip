import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
import { createReturn, getAllReturns, getMyReturns, confirmReturn, deleteReturn, cancelReturn, extendReturn, approveExtension } from "../controllers/returnController.js";

const router = Router();

// TK tạo phiếu trả
router.post("/create", authMiddleware, roleMiddleware("TRUONG_KHOA"), createReturn);

// NV_KHO xem danh sách phiếu trả
router.get("/", authMiddleware, roleMiddleware("ADMIN", "NV_KHO", "QL_KHO"), getAllReturns);

// TK xem phiếu trả của mình
router.get("/my", authMiddleware, roleMiddleware("TRUONG_KHOA"), getMyReturns);

// NV_KHO chấp nhận/từ chối phiếu trả
router.put("/:id/confirm", authMiddleware, roleMiddleware("ADMIN", "NV_KHO", "QL_KHO"), confirmReturn);

// Xóa (ẩn) phiếu trả
router.delete("/:id", authMiddleware, deleteReturn);

// Hủy yêu cầu trả (chỉ dành cho TK)
router.post("/:id/cancel", authMiddleware, roleMiddleware("TRUONG_KHOA"), cancelReturn);

// Gia hạn
router.post("/extend", authMiddleware, roleMiddleware("TRUONG_KHOA"), extendReturn);
router.post("/approve-extension", authMiddleware, roleMiddleware("ADMIN", "NV_KHO", "QL_KHO"), approveExtension);

export default router;
