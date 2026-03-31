import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./config/db.js";
import { createServer } from "http";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import equipmentRoutes from "./routes/equipment.js";
import inventoryRoutes from "./routes/inventory.js";
import supplierRoutes from "./routes/suppliers.js";
import departmentRoutes from "./routes/departments.js";
import importRoutes from "./routes/imports.js";
import exportRoutes from "./routes/exports.js";
import requestRoutes from "./routes/requests.js";
import allocationRoutes from "./routes/allocations.js";
import damageReportRoutes from "./routes/damageReports.js";
import notificationRoutes from "./routes/notifications.js";
import reportRoutes from "./routes/reports.js";
import importRequestRoutes from "./routes/importRequests.js";

dotenv.config();

const app = express();
// Trigger nodemon restart
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [process.env.CLIENT_URL || "http://localhost:5173", "http://localhost:8080"],
    credentials: true,
  }
});
app.set("io", io);

io.on("connection", (socket) => {
  console.log("Client connected via socket:", socket.id);
  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});

// Middleware to automatically emit data_changed after state-mutating requests
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    if (data?.success && ["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
      // Map base URLs to data types
      const url = req.originalUrl;
      const typesToRefresh = new Set();
      if (url.includes("/requests")) { typesToRefresh.add("requests"); typesToRefresh.add("notifications"); typesToRefresh.add("inventory"); typesToRefresh.add("allocations"); }
      if (url.includes("/damage-reports")) { typesToRefresh.add("damageReports"); typesToRefresh.add("inventory"); typesToRefresh.add("notifications"); }
      if (url.includes("/exports")) { typesToRefresh.add("exports"); typesToRefresh.add("inventory"); typesToRefresh.add("notifications"); }
      if (url.includes("/departments")) typesToRefresh.add("departments");
      if (url.includes("/equipment")) { typesToRefresh.add("equipment"); typesToRefresh.add("inventory"); }
      if (url.includes("/imports")) { typesToRefresh.add("imports"); typesToRefresh.add("inventory"); }
      
      if (typesToRefresh.size > 0) {
        io.emit("data_changed", { types: Array.from(typesToRefresh) });
      }
    }
    return originalJson.call(this, data);
  };
  next();
});

app.use(cors({
  origin: [process.env.CLIENT_URL || "http://localhost:5173", "http://localhost:8080"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Health check
app.get("/", (req, res) => res.send("MedEquip API running"));

// Test DB
app.get("/api/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 as status");
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/equipment", equipmentRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/imports", importRoutes);
app.use("/api/exports", exportRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/allocations", allocationRoutes);
app.use("/api/damage-reports", damageReportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/import-requests", importRequestRoutes);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 MedEquip API running on http://localhost:${PORT}`);
  console.log(`📋 API docs: http://localhost:${PORT}/api/test-db`);
});
