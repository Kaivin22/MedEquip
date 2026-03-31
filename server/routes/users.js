import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
import { getAllUsers, getUserById, createUser, updateUser, deactivateUser, activateUser, changeUserRole, changePassword } from "../controllers/userController.js";

const router = Router();

router.get("/", authMiddleware, getAllUsers);
router.get("/:id", authMiddleware, getUserById);
router.post("/", authMiddleware, roleMiddleware("ADMIN"), createUser);
router.put("/:id", authMiddleware, updateUser);
router.put("/:id/deactivate", authMiddleware, roleMiddleware("ADMIN"), deactivateUser);
router.put("/:id/activate", authMiddleware, roleMiddleware("ADMIN"), activateUser);
router.put("/:id/role", authMiddleware, roleMiddleware("ADMIN"), changeUserRole);
router.put("/:id/password", authMiddleware, changePassword);

export default router;
