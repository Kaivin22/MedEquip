import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
import { getAllDepartments, createDepartment, updateDepartment } from "../controllers/departmentController.js";

const router = Router();

router.get("/", authMiddleware, getAllDepartments);
router.post("/", authMiddleware, roleMiddleware("ADMIN"), createDepartment);
router.put("/:id", authMiddleware, roleMiddleware("ADMIN"), updateDepartment);

export default router;
