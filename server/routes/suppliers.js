import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
import { getAllSuppliers, createSupplier, updateSupplier, deleteSupplier } from "../controllers/supplierController.js";

const router = Router();

router.get("/", authMiddleware, getAllSuppliers);
router.post("/", authMiddleware, roleMiddleware("ADMIN"), createSupplier);
router.put("/:id", authMiddleware, roleMiddleware("ADMIN"), updateSupplier);
router.delete("/:id", authMiddleware, roleMiddleware("ADMIN"), deleteSupplier);

export default router;
