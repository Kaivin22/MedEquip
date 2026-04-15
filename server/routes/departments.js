import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
import { getAllDepartments, createDepartment, updateDepartment, deleteDepartment } from "../controllers/departmentController.js";

const router = Router();

router.get("/", authMiddleware, getAllDepartments);
router.post("/", authMiddleware, roleMiddleware("ADMIN"), createDepartment);
router.delete("/:id", authMiddleware, roleMiddleware("ADMIN"), deleteDepartment);
router.put("/:id", authMiddleware, roleMiddleware("ADMIN"), updateDepartment);
router.delete("/:id", authMiddleware, roleMiddleware("ADMIN"), deleteDepartment);

export default router;
