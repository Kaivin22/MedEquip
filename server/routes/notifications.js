import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getUserNotifications, markAsRead, markAllAsRead } from "../controllers/notificationController.js";

const router = Router();

router.get("/", authMiddleware, getUserNotifications);
router.put("/:id/read", authMiddleware, markAsRead);
router.put("/read-all", authMiddleware, markAllAsRead);

export default router;
