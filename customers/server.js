require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const { createPoolFromEnv } = require("./db");

const CostumersModel = require("./model");
const CostumersController = require("./controller");
const createCostumersRouter = require("./routes");

const DressesModel = require("./dresses.model");
const DressesController = require("./dresses.controller");
const createDressesRouter = require("./dresses.routes");

const OrdersModel = require("./orders.model");
const OrdersController = require("./orders.controller");
const createOrdersRouter = require("./orders.routes");

const app = express();
app.use(cors());
app.use(express.json());

const dbPool = createPoolFromEnv();
app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await dbPool.query("SELECT 1 AS ok");
    res.json(rows[0]);
  } catch (err) {
    console.error("DB TEST ERROR:", err);
    res.status(500).json({ message: "DB connection failed", error: String(err) });
  }
});


const customersModel = new CostumersModel(dbPool);
const customersController = new CostumersController(customersModel);
const customersRouter = createCostumersRouter(customersController);


const dressesModel = new DressesModel(dbPool);
const dressesController = new DressesController(dressesModel);
const dressesRouter = createDressesRouter(dressesController);

const ordersModel = new OrdersModel(dbPool);
const ordersController = new OrdersController(ordersModel);
const ordersRouter = createOrdersRouter(ordersController);

app.use("/api/customers", customersRouter);
app.use("/api/costumers", customersRouter);
app.use("/api/dresses", dressesRouter);
app.use("/api/orders", ordersRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

const clientPath = path.join(__dirname, "client");
app.use(express.static(clientPath));
app.get("/", (req, res) => res.sendFile(path.join(clientPath, "index.html")));

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
