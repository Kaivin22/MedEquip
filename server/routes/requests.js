import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
import { getAllRequests, createRequest, approveDept, approveManager, processRequest, confirmReceived } from "../controllers/requestController.js";

const router = Router();

router.get("/", authMiddleware, getAllRequests);

router.post("/", authMiddleware, createRequest);
router.put("/:id/approve-dept", authMiddleware, roleMiddleware("TRUONG_KHOA", "ADMIN"), approveDept);
router.put("/:id/approve-mgr", authMiddleware, roleMiddleware("ADMIN"), approveManager);
router.post("/:id/process", authMiddleware, roleMiddleware("ADMIN", "NV_KHO"), processRequest);
router.put("/:id/confirm", authMiddleware, confirmReceived);

export default router;
