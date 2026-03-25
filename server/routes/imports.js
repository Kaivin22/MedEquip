import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
import { getAllImports, createImport } from "../controllers/importController.js";

const router = Router();

router.get("/", authMiddleware, getAllImports);
router.post("/", authMiddleware, roleMiddleware("ADMIN", "NV_KHO"), createImport);


export default router;
