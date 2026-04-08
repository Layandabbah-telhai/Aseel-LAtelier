require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
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

const AppointmentsModel = require("./appointments/model");
const AppointmentsController = require("./appointments/controller");
const createAppointmentsRouter = require("./appointments/routes");

const MeasurementsModel = require("./measurements/model");
const MeasurementsController = require("./measurements/controller");
const createMeasurementsRouter = require("./measurements/routes");

const SeamstressesModel = require("./seamstresses/model");
const SeamstressesController = require("./seamstresses/controller");
const createSeamstressesRouter = require("./seamstresses/routes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "25mb" }));

const dbPool = createPoolFromEnv();

// ---------------- HEALTH ----------------
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

// ---------------- LOGIN ----------------
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const [rows] = await dbPool.query(
      `SELECT user_id, email, name, role
       FROM users
       WHERE email = ? AND password = ?
       LIMIT 1`,
      [String(email).trim(), String(password)]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = rows[0];

    res.json({
      message: "Login successful",
      token: `aseel_user_${user.user_id}`,
      user,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error", error: String(err) });
  }
});

// ---------------- IMAGE UPLOAD ----------------
const upload = multer({
  storage: multer.memoryStorage(),
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

    const imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    res.status(201).json({
      message: "Image uploaded successfully",
      image_url: imageUrl,
      filename: req.file.originalname || "image",
    });
  });
});

// ---------------- ROUTERS ----------------
const customersModel = new CostumersModel(dbPool);
const customersController = new CostumersController(customersModel);
const customersRouter = createCostumersRouter(customersController);

const dressesModel = new DressesModel(dbPool);
const dressesController = new DressesController(dressesModel);
const dressesRouter = createDressesRouter(dressesController);

const ordersModel = new OrdersModel(dbPool);
const ordersController = new OrdersController(ordersModel);
const ordersRouter = createOrdersRouter(ordersController);

const appointmentsModel = new AppointmentsModel(dbPool);
const appointmentsController = new AppointmentsController(appointmentsModel);
const appointmentsRouter = createAppointmentsRouter(appointmentsController);

const measurementsModel = new MeasurementsModel(dbPool);
const measurementsController = new MeasurementsController(measurementsModel);
const measurementsRouter = createMeasurementsRouter(measurementsController);

const seamstressesModel = new SeamstressesModel(dbPool);
const seamstressesController = new SeamstressesController(seamstressesModel);
const seamstressesRouter = createSeamstressesRouter(seamstressesController);

app.use("/api/customers", customersRouter);
app.use("/api/costumers", customersRouter);
app.use("/api/dresses", dressesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/measurements", measurementsRouter);
app.use("/api/seamstresses", seamstressesRouter);

// ---------------- STATIC ----------------
const publicPath = path.join(__dirname, "..");
app.use(express.static(publicPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});