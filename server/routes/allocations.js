import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
import { getAllAllocations, createAllocation, extendRequest, extendApprove } from "../controllers/allocationController.js";

const router = Router();

router.get("/", authMiddleware, getAllAllocations);
router.post("/", authMiddleware, roleMiddleware("ADMIN", "NV_KHO"), createAllocation);

// TK gửi yêu cầu gia hạn
router.post("/:id/extend-request", authMiddleware, roleMiddleware("TRUONG_KHOA"), extendRequest);

// NV_KHO chấp nhận/từ chối gia hạn
router.put("/:id/extend-approve", authMiddleware, roleMiddleware("ADMIN", "NV_KHO"), extendApprove);

export default router;
