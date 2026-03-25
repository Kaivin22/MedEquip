import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
import { getAllSuppliers, createSupplier, updateSupplier } from "../controllers/supplierController.js";

const router = Router();

router.get("/", authMiddleware, getAllSuppliers);
router.post("/", authMiddleware, roleMiddleware("ADMIN"), createSupplier);
router.put("/:id", authMiddleware, roleMiddleware("ADMIN"), updateSupplier);

export default router;
