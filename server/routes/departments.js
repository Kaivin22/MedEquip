import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
import { getAllDepartments, createDepartment, deleteDepartment, updateDepartment } from "../controllers/departmentController.js";

const router = Router();

router.get("/", authMiddleware, getAllDepartments);
router.post("/", authMiddleware, roleMiddleware("ADMIN"), createDepartment);
router.delete("/:id", authMiddleware, roleMiddleware("ADMIN"), deleteDepartment);
router.put("/:id", authMiddleware, roleMiddleware("ADMIN"), updateDepartment);

export default router;
