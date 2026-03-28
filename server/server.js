require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const { createPoolFromEnv } = require("./db");

const CostumersModel = require("./customers/model");
const CostumersController = require("./customers/controller");
const createCostumersRouter = require("./customers/routes");

const DressesModel = require("./dresses/dresses.model");
const DressesController = require("./dresses/dresses.controller");
const createDressesRouter = require("./dresses/dresses.routes");

const OrdersModel = require("./orders/orders.model");
const OrdersController = require("./orders/orders.controller");
const createOrdersRouter = require("./orders/orders.routes");

const app = express();

app.use(cors());
app.use(express.json());

const dbPool = createPoolFromEnv();

// ---------- Debug / health ----------
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await dbPool.query("SELECT 1 AS ok");
    res.json(rows[0]);
  } catch (err) {
    console.error("DB TEST ERROR:", err);
    res.status(500).json({
      message: "DB connection failed",
      error: String(err),
    });
  }
});

// ---------- Uploads ----------
const imagesDir = path.join(__dirname, "..", "client", "images");
fs.mkdirSync(imagesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeBase = path
      .basename(file.originalname || "dress-image", ext)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();

    const uniqueName = `${Date.now()}-${safeBase}${ext || ".jpg"}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, WEBP, and GIF files are allowed"));
    }
    cb(null, true);
  },
});

app.post("/api/upload-image", (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        message: err.message || "Image upload failed",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "No image file uploaded",
      });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    res.status(201).json({
      message: "Image uploaded successfully",
      image_url: `${baseUrl}/images/${req.file.filename}`,
      filename: req.file.filename,
    });
  });
});

// ---------- Customers ----------
const customersModel = new CostumersModel(dbPool);
const customersController = new CostumersController(customersModel);
const customersRouter = createCostumersRouter(customersController);

// ---------- Dresses ----------
const dressesModel = new DressesModel(dbPool);
const dressesController = new DressesController(dressesModel);
const dressesRouter = createDressesRouter(dressesController);

// ---------- Orders ----------
const ordersModel = new OrdersModel(dbPool);
const ordersController = new OrdersController(ordersModel);
const ordersRouter = createOrdersRouter(ordersController);

// ---------- API routes ----------
app.use("/api/customers", customersRouter);
app.use("/api/costumers", customersRouter);
app.use("/api/dresses", dressesRouter);
app.use("/api/orders", ordersRouter);

// ---------- Static files ----------
const publicPath = path.join(__dirname, "..");

app.use("/images", express.static(path.join(publicPath, "client", "images")));
app.use(express.static(publicPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});