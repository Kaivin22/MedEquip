import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
import { getAllRequests, createRequest, approveDept, approveManager, scanRequest, processRequestItems, confirmReceived, deleteRequest } from "../controllers/requestController.js";

const router = Router();

router.get("/", authMiddleware, getAllRequests);
router.post("/", authMiddleware, createRequest);
router.put("/:id/approve-dept", authMiddleware, roleMiddleware("TRUONG_KHOA", "ADMIN", "QL_KHO"), approveDept);
router.put("/:id/approve-mgr", authMiddleware, roleMiddleware("ADMIN", "NV_KHO", "QL_KHO"), approveManager);
router.get("/:id/scan", authMiddleware, scanRequest);
router.post("/:id/process-items", authMiddleware, roleMiddleware("ADMIN", "NV_KHO", "QL_KHO"), processRequestItems);
router.put("/:id/confirm", authMiddleware, confirmReceived);
router.delete("/:id", authMiddleware, roleMiddleware("ADMIN", "QL_KHO"), deleteRequest);

export default router;
