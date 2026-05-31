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
const OccasionRequestsModel = require("./models/occasionRequestsModel");

// ---------------- CONTROLLERS ----------------
const CustomersController = require("./controllers/customersController");
const DressesController = require("./controllers/dressesController");
const OrdersController = require("./controllers/ordersController");
const AppointmentsController = require("./controllers/appointmentsController");
const MeasurementsController = require("./controllers/measurementsController");
const SeamstressesController = require("./controllers/seamstressesController");
const OccasionRequestsController = require("./controllers/occasionRequestsController");

// ---------------- ROUTES ----------------
const createCustomersRouter = require("./routes/customersRoutes");
const createDressesRouter = require("./routes/dressesRoutes");
const createOrdersRouter = require("./routes/ordersRoutes");
const createAppointmentsRouter = require("./routes/appointmentsRoutes");
const createMeasurementsRouter = require("./routes/measurementsRoutes");
const createSeamstressesRouter = require("./routes/seamstressesRoutes");
const createOccasionRequestsRouter = require("./routes/occasionRequestsRoutes");

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

// ---------------- REGISTER CUSTOMER ----------------
app.post("/api/register", async (req, res) => {
  const connection = await dbPool.getConnection();

  try {
    const {
      first_name,
      last_name,
      city,
      phone,
      birth_date,
      email,
      password,
      source_type,
      source_details,
    } = req.body || {};

    if (!first_name || !last_name || !phone || !email || !password) {
      return res.status(400).json({
        message: "First name, last name, phone, email and password are required",
      });
    }

    await connection.beginTransaction();

    const [existingUsers] = await connection.query(
      `SELECT user_id FROM users WHERE email = ? LIMIT 1`,
      [String(email).trim()]
    );

    if (existingUsers.length) {
      await connection.rollback();
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    const [customerResult] = await connection.query(
      `
      INSERT INTO customers
      (
        first_name,
        last_name,
        city,
        phone,
        birth_date,
        email,
        source_type,
        source_details
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        String(first_name).trim(),
        String(last_name).trim(),
        city ? String(city).trim() : null,
        String(phone).trim(),
        birth_date || null,
        String(email).trim(),
        source_type || null,
        source_details || null,
      ]
    );

    const customerId = customerResult.insertId;

    const fullName = `${first_name} ${last_name}`.trim();

    const [userResult] = await connection.query(
      `
      INSERT INTO users
      (
        email,
        password,
        name,
        role,
        customer_id
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        String(email).trim(),
        String(password),
        fullName,
        "customer",
        customerId,
      ]
    );

    await connection.commit();

    const user = {
      user_id: userResult.insertId,
      email: String(email).trim(),
      name: fullName,
      role: "customer",
      customer_id: customerId,
    };

    res.status(201).json({
      message: "Registration successful",
      token: `aseel_user_${user.user_id}`,
      user,
    });
  } catch (err) {
    await connection.rollback();

    console.error("REGISTER ERROR:", err);

    res.status(500).json({
      message: "Server error",
      error: String(err),
    });
  } finally {
    connection.release();
  }
});

// ---------------- CUSTOMER DASHBOARD ----------------
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
      SELECT
        customer_id,
        first_name,
        last_name,
        email,
        phone,
        city
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

      LEFT JOIN dresses d
        ON d.dress_id = o.dress_id

      LEFT JOIN payments p
        ON p.order_id = o.order_id

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
          notes,
          requested_by
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

        dress_name: order.dress_name || "Not assigned yet",

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
// ---------------- ADMIN CUSTOMER FULL PROFILE ----------------
app.get("/api/admin/customer-profile/:customerId", async (req, res) => {
  try {
    const customerId = Number(req.params.customerId);

    if (!Number.isFinite(customerId)) {
      return res.status(400).json({
        message: "Invalid customer id",
      });
    }

    const [[customer]] = await dbPool.query(
      `
      SELECT
        customer_id,
        first_name,
        last_name,
        city,
        phone,
        email,
        birth_date,
        source_type,
        source_details
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

      LEFT JOIN dresses d
        ON d.dress_id = o.dress_id

      LEFT JOIN payments p
        ON p.order_id = o.order_id

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

    let appointments = [];
    let measurements = [];
    let payments = [];
    let seamstresses = [];

    if (orderIds.length) {
      const placeholders = orderIds.map(() => "?").join(",");

      const [appointmentRows] = await dbPool.query(
        `
        SELECT
          appointment_id,
          customer_id,
          order_id,
          appointment_type,
          appointment_date,
          appointment_time,
          status,
          notes
        FROM appointments
        WHERE order_id IN (${placeholders})
        ORDER BY appointment_date DESC, appointment_time DESC
        `,
        orderIds
      );

      appointments = appointmentRows;

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

      const [paymentRows] = await dbPool.query(
        `
        SELECT
          payment_id,
          order_id,
          payment_date,
          amount,
          payment_method,
          notes,
          due_date,
          reference_number,
          payment_status
        FROM payments
        WHERE order_id IN (${placeholders})
        ORDER BY payment_date DESC, payment_id DESC
        `,
        orderIds
      );

      payments = paymentRows;

      try {
        const [seamstressRows] = await dbPool.query(
          `
          SELECT
            os.order_id,
            os.seamstress_id,
            s.name AS seamstress_name,
            s.phone AS seamstress_phone
          FROM order_seamstresses os
          JOIN seamstresses s
            ON s.seamstress_id = os.seamstress_id
          WHERE os.order_id IN (${placeholders})
          ORDER BY os.order_id DESC
          `,
          orderIds
        );

        seamstresses = seamstressRows;
      } catch (err) {
        if (!["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(err.code)) {
          throw err;
        }

        seamstresses = [];
      }
    }

    const fullOrders = orders.map((order) => {
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

        appointments: appointments.filter(
          (a) => Number(a.order_id) === Number(order.order_id)
        ),

        measurements: measurements.filter(
          (m) => Number(m.order_id) === Number(order.order_id)
        ),

        payments: payments
          .filter((p) => Number(p.order_id) === Number(order.order_id))
          .map((p) => ({
            ...p,
            amount: Number(p.amount || 0),
          })),

        seamstresses: seamstresses.filter(
          (s) => Number(s.order_id) === Number(order.order_id)
        ),
      };
    });

    res.json({
      customer,
      orders: fullOrders,
    });
  } catch (err) {
    console.error("ADMIN CUSTOMER PROFILE ERROR:", err);

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

    const [existingPending] = await dbPool.query(
      `
      SELECT appointment_id
      FROM appointments
      WHERE order_id = ?
        AND customer_id = ?
        AND status = 'pending'
        AND requested_by = 'customer'
      LIMIT 1
      `,
      [Number(order_id), Number(customer_id)]
    );

    if (existingPending.length) {
      return res.status(400).json({
        message:
          "You already have a pending appointment request for this order.",
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

// ---------------- IMAGE UPLOAD ----------------
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

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

const occasionRequestsModel = new OccasionRequestsModel(dbPool);

const occasionRequestsController =
  new OccasionRequestsController(occasionRequestsModel);

const occasionRequestsRouter =
  createOccasionRequestsRouter(occasionRequestsController);

// ---------------- API ROUTES ----------------
app.use("/api/customers", customersRouter);
app.use("/api/costumers", customersRouter);

app.use("/api/dresses", dressesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/measurements", measurementsRouter);
app.use("/api/seamstresses", seamstressesRouter);

app.use("/api", occasionRequestsRouter);

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