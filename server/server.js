require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");

const { createPoolFromEnv } = require("./db");

// ---------------- MODELS ----------------
const CustomersModel = require("./models/customersModel");
const DressesModel = require("./models/dressesModel");
const OrdersModel = require("./models/ordersModel");
const AppointmentsModel = require("./models/appointmentsModel");
const MeasurementsModel = require("./models/measurementsModel");
const SeamstressesModel = require("./models/seamstressesModel");

// ---------------- CONTROLLERS ----------------
const CustomersController = require("./controllers/customersController");
const DressesController = require("./controllers/dressesController");
const OrdersController = require("./controllers/ordersController");
const AppointmentsController = require("./controllers/appointmentsController");
const MeasurementsController = require("./controllers/measurementsController");
const SeamstressesController = require("./controllers/seamstressesController");

// ---------------- ROUTES ----------------
const createCustomersRouter = require("./routes/customersRoutes");
const createDressesRouter = require("./routes/dressesRoutes");
const createOrdersRouter = require("./routes/ordersRoutes");
const createAppointmentsRouter = require("./routes/appointmentsRoutes");
const createMeasurementsRouter = require("./routes/measurementsRoutes");
const createSeamstressesRouter = require("./routes/seamstressesRoutes");

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
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const [rows] = await dbPool.query(
      `
      SELECT user_id, email, name, role, customer_id
      FROM users
      WHERE email = ? AND password = ?
      LIMIT 1
      `,
      [String(email).trim(), String(password)]
    );

    if (!rows.length) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = rows[0];

    res.json({
      message: "Login successful",
      token: `aseel_user_${user.user_id}`,
      user,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({
      message: "Server error",
      error: String(err),
    });
  }
});

// ---------------- CUSTOMER DASHBOARD API ----------------
app.get("/api/customer-dashboard/:customerId", async (req, res) => {
  try {
    const customerId = Number(req.params.customerId);

    if (!Number.isFinite(customerId)) {
      return res.status(400).json({
        message: "Invalid customer id",
      });
    }

    const [[customer]] = await dbPool.query(
      `
      SELECT customer_id, first_name, last_name, email, phone, city
      FROM customers
      WHERE customer_id = ?
      `,
      [customerId]
    );

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    const [orders] = await dbPool.query(
      `
      SELECT
        o.order_id,
        o.customer_id,
        o.dress_id,
        o.order_type,
        o.occasion_type,
        o.order_date,
        o.return_date,
        o.total_price,
        o.status,
        d.dress_name,
        d.size,
        d.color,
        d.image_url,
        COALESCE(SUM(p.amount), 0) AS paid_amount
      FROM orders o
      LEFT JOIN dresses d ON d.dress_id = o.dress_id
      LEFT JOIN payments p ON p.order_id = o.order_id
      WHERE o.customer_id = ?
      GROUP BY
        o.order_id,
        o.customer_id,
        o.dress_id,
        o.order_type,
        o.occasion_type,
        o.order_date,
        o.return_date,
        o.total_price,
        o.status,
        d.dress_name,
        d.size,
        d.color,
        d.image_url
      ORDER BY o.order_id DESC
      `,
      [customerId]
    );

    const orderIds = orders.map((o) => o.order_id);

    let measurements = [];
    let appointments = [];
    let payments = [];

    if (orderIds.length) {
      const placeholders = orderIds.map(() => "?").join(",");

      const [measurementRows] = await dbPool.query(
        `
        SELECT
          measurement_id,
          customer_id,
          order_id,
          tailoring_type,
          bust,
          waist,
          hips,
          shoulder,
          sleeve_length,
          dress_length,
          notes
        FROM measurements
        WHERE order_id IN (${placeholders})
        ORDER BY measurement_id DESC
        `,
        orderIds
      );

      measurements = measurementRows;

      const [appointmentRows] = await dbPool.query(
        `
        SELECT
          appointment_id,
          customer_id,
          order_id,
          appointment_date,
          appointment_time,
          appointment_type AS type,
          status,
          notes
        FROM appointments
        WHERE order_id IN (${placeholders})
        ORDER BY appointment_date DESC, appointment_time DESC
        `,
        orderIds
      );

      appointments = appointmentRows;

      const [paymentRows] = await dbPool.query(
        `
        SELECT
          payment_id,
          order_id,
          payment_date,
          amount,
          payment_method,
          notes,
          payment_status
        FROM payments
        WHERE order_id IN (${placeholders})
        ORDER BY payment_date DESC, payment_id DESC
        `,
        orderIds
      );

      payments = paymentRows;
    }

    const dashboardOrders = orders.map((order) => {
      const orderPayments = payments.filter(
        (p) => Number(p.order_id) === Number(order.order_id)
      );

      const orderMeasurements = measurements.filter(
        (m) => Number(m.order_id) === Number(order.order_id)
      );

      const orderAppointments = appointments.filter(
        (a) => Number(a.order_id) === Number(order.order_id)
      );

      const totalPrice = Number(order.total_price || 0);
      const paidAmount = Number(order.paid_amount || 0);

      return {
        ...order,
        total_price: totalPrice,
        paid_amount: paidAmount,
        remaining_amount: Math.max(totalPrice - paidAmount, 0),
        payment_status:
          paidAmount <= 0
            ? "unpaid"
            : paidAmount < totalPrice
              ? "partial"
              : "paid",
        measurements: orderMeasurements,
        appointments: orderAppointments,
        payments: orderPayments.map((p) => ({
          ...p,
          amount: Number(p.amount || 0),
        })),
      };
    });

    res.json({
      customer,
      orders: dashboardOrders,
    });
  } catch (err) {
    console.error("CUSTOMER DASHBOARD ERROR:", err);
    res.status(500).json({
      message: "Server error",
      error: String(err),
    });
  }
});

// ---------------- CUSTOMER FEEDBACK ----------------
app.post("/api/customer-feedback", async (req, res) => {
  try {
    const { customer_id, order_id, rating, comment } = req.body || {};

    if (!customer_id || !order_id || !rating) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    await dbPool.query(
      `
      INSERT INTO feedback
      (
        customer_id,
        order_id,
        rating,
        comment
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        Number(customer_id),
        Number(order_id),
        Number(rating),
        comment || null,
      ]
    );

    res.status(201).json({
      message: "Feedback submitted successfully",
    });
  } catch (err) {
    console.error("FEEDBACK ERROR:", err);
    res.status(500).json({
      message: "Server error",
      error: String(err),
    });
  }
});

// ---------------- CUSTOMER APPOINTMENT REQUEST ----------------
app.post("/api/customer-appointment-request", async (req, res) => {
  try {
    const {
      customer_id,
      order_id,
      appointment_date,
      appointment_time,
      type,
      notes,
    } = req.body || {};

    if (
      !customer_id ||
      !order_id ||
      !appointment_date ||
      !appointment_time ||
      !type
    ) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    await dbPool.query(
      `
      INSERT INTO appointments
      (
        customer_id,
        order_id,
        appointment_date,
        appointment_time,
        appointment_type,
        status,
        notes,
        requested_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        Number(customer_id),
        Number(order_id),
        appointment_date,
        appointment_time,
        type,
        "pending",
        notes || null,
        "customer",
      ]
    );

    res.status(201).json({
      message: "Appointment request submitted successfully",
    });
  } catch (err) {
    console.error("APPOINTMENT REQUEST ERROR:", err);
    res.status(500).json({
      message: "Server error",
      error: String(err),
    });
  }
});

// ---------------- CUSTOMER OCCASION REQUEST ----------------
app.post("/api/customer-occasion-request", async (req, res) => {
  try {
    const {
      customer_id,
      occasion_type,
      event_date,
      order_type,
      notes,
    } = req.body || {};

    if (
      !customer_id ||
      !occasion_type ||
      !order_type
    ) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    await dbPool.query(
      `
      INSERT INTO occasion_requests
      (
        customer_id,
        occasion_type,
        event_date,
        order_type,
        notes,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        Number(customer_id),
        occasion_type,
        event_date || null,
        order_type,
        notes || null,
        "pending",
      ]
    );

    res.status(201).json({
      message: "Occasion request submitted successfully",
    });
  } catch (err) {
    console.error("OCCASION REQUEST ERROR:", err);

    res.status(500).json({
      message: "Server error",
      error: String(err),
    });
  }
});

app.get("/api/occasion-requests", async (req, res) => {
  try {
    const [rows] = await dbPool.query(
      `
      SELECT
        r.request_id,
        r.customer_id,
        r.occasion_type,
        r.event_date,
        r.order_type,
        r.notes,
        r.status,
        r.admin_notes,
        r.created_at,
        c.first_name,
        c.last_name,
        c.phone,
        c.email
      FROM occasion_requests r
      LEFT JOIN customers c
        ON c.customer_id = r.customer_id
      ORDER BY r.created_at DESC
      `
    );

    res.json(rows);
  } catch (err) {
    console.error("GET OCCASION REQUESTS ERROR:", err);

    res.status(500).json({
      message: "Server error",
      error: String(err),
    });
  }
});

app.put("/api/occasion-requests/:id/status", async (req, res) => {
  try {
    const requestId = Number(req.params.id);

    const {
      status,
      admin_notes,
    } = req.body || {};

    if (!status) {
      return res.status(400).json({
        message: "Status is required",
      });
    }

    await dbPool.query(
      `
      UPDATE occasion_requests
      SET
        status = ?,
        admin_notes = ?
      WHERE request_id = ?
      `,
      [
        status,
        admin_notes || null,
        requestId,
      ]
    );

    res.json({
      message: "Request updated successfully",
    });
  } catch (err) {
    console.error("UPDATE OCCASION REQUEST ERROR:", err);

    res.status(500).json({
      message: "Server error",
      error: String(err),
    });
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
      return cb(
        new Error("Only JPG, PNG, WEBP, and GIF files are allowed")
      );
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

    const imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString(
      "base64"
    )}`;

    res.status(201).json({
      message: "Image uploaded successfully",
      image_url: imageUrl,
      filename: req.file.originalname || "image",
    });
  });
});

// ---------------- INIT MVC ----------------
const customersModel = new CustomersModel(dbPool);
const customersController = new CustomersController(customersModel);
const customersRouter = createCustomersRouter(customersController);

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

// ---------------- API ROUTES ----------------
app.use("/api/customers", customersRouter);
app.use("/api/costumers", customersRouter);
app.use("/api/dresses", dressesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/measurements", measurementsRouter);
app.use("/api/seamstresses", seamstressesRouter);

// ---------------- STATIC ----------------
const rootPath = path.join(__dirname, "..");
const clientPath = path.join(rootPath, "client");

console.log("Serving root from:", rootPath);
console.log("Serving client from:", clientPath);

app.use(express.static(rootPath));
app.use("/client", express.static(clientPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(rootPath, "index.html"));
});

// ---------------- START SERVER ----------------
const port = Number(process.env.PORT || 4000);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});