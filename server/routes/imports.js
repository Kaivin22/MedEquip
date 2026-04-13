import { Router } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";
import multer from "multer";
import {
  getAllImports, deleteImport,
  parseExcelPreview, confirmImportFromExcel, downloadTemplate
} from "../controllers/importController.js";

const router = Router();

// Multer: lưu trong bộ nhớ, không ghi ra ổ đĩa
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Lịch sử nhập kho
router.get("/", authMiddleware, getAllImports);

// Xóa lịch sử (Admin)
router.delete("/:id", authMiddleware, roleMiddleware("ADMIN"), deleteImport);

// Upload Excel → preview (chưa nhập vào DB)
router.post("/from-excel", authMiddleware, roleMiddleware("ADMIN", "NV_KHO"), upload.single("file"), parseExcelPreview);

// Xác nhận nhập kho từ preview đã duyệt
router.post("/confirm", authMiddleware, roleMiddleware("ADMIN", "NV_KHO"), confirmImportFromExcel);

// Tải file Excel mẫu
router.get("/template", authMiddleware, downloadTemplate);

export default router;
