const ALLOWED_ORDER_TYPES = ["sale", "rental"];
const ALLOWED_ORDER_STATUS = [
  "in_progress",
  "sewing",
  "ready_for_fitting",
  "completed",
];

function normalizeOrderInput(body) {
  return {
    customer_id: Number(body?.customer_id),
    dress_id: Number(body?.dress_id),
    order_type: String(body?.order_type || "").trim().toLowerCase(),
    order_date: String(body?.order_date || "").trim(),
    return_date: body?.return_date ? String(body.return_date).trim() : null,
    total_price:
      body?.total_price === "" || body?.total_price === undefined
        ? null
        : Number(body.total_price),
    status: String(body?.status || "").trim(),
  };
}

function validateOrderInput(data) {
  if (!Number.isFinite(data.customer_id)) return "customer_id is required";
  if (!Number.isFinite(data.dress_id)) return "dress_id is required";
  if (!ALLOWED_ORDER_TYPES.includes(data.order_type)) {
    return "order_type must be sale or rental";
  }
  if (!data.order_date) return "order_date is required";
  if (data.order_type === "rental" && !data.return_date) {
    return "return_date is required for rental";
  }
  if (data.return_date && data.return_date < data.order_date) {
    return "return_date must be after order_date";
  }
  if (data.total_price === null || Number.isNaN(data.total_price)) {
    return "total_price must be a number";
  }
  if (!ALLOWED_ORDER_STATUS.includes(data.status)) {
    return "invalid order status";
  }
  return null;
}

function normalizePaymentInput(body) {
  return {
    payment_date: String(body?.payment_date || "").trim(),
    amount:
      body?.amount === "" || body?.amount === undefined
        ? null
        : Number(body.amount),
    payment_method: String(body?.payment_method || "").trim(),
    notes: String(body?.notes || "").trim(),
    due_date: body?.due_date ? String(body.due_date).trim() : null,
    reference_number: String(body?.reference_number || "").trim(),
    payment_status: String(body?.payment_status || "Paid").trim(),
  };
}

function validatePaymentInput(data) {
  if (!data.payment_date) return "payment_date is required";
  if (data.amount === null || Number.isNaN(data.amount) || data.amount <= 0) {
    return "amount must be a positive number";
  }
  return null;
}

class OrdersController {
  constructor(model) {
    this.model = model;

    this.list = this.list.bind(this);
    this.get = this.get.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.remove = this.remove.bind(this);

    this.listPayments = this.listPayments.bind(this);
    this.createPayment = this.createPayment.bind(this);
    this.deletePayment = this.deletePayment.bind(this);
  }

  async list(req, res) {
    try {
      const rows = await this.model.list({
        search: req.query.search || "",
        status: req.query.status || "",
      });
      res.json(rows);
    } catch (err) {
      console.error("ORDERS LIST ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async get(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: "Invalid id" });
      }

      const order = await this.model.getById(id);
      if (!order) return res.status(404).json({ message: "Not found" });

      res.json(order);
    } catch (err) {
      console.error("ORDERS GET ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async create(req, res) {
    try {
      const data = normalizeOrderInput(req.body);
      const errMsg = validateOrderInput(data);
      if (errMsg) return res.status(400).json({ message: errMsg });

      const created = await this.model.create(data);
      res.status(201).json(created);
    } catch (err) {
      console.error("ORDERS CREATE ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async update(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: "Invalid id" });
      }

      const data = normalizeOrderInput(req.body);
      const errMsg = validateOrderInput(data);
      if (errMsg) return res.status(400).json({ message: errMsg });

      const updated = await this.model.update(id, data);
      if (!updated) return res.status(404).json({ message: "Not found" });

      res.json(updated);
    } catch (err) {
      console.error("ORDERS UPDATE ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async remove(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: "Invalid id" });
      }

      const ok = await this.model.remove(id);
      if (!ok) return res.status(404).json({ message: "Not found" });

      res.json({ message: "Deleted" });
    } catch (err) {
      console.error("ORDERS DELETE ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async listPayments(req, res) {
    try {
      const orderId = Number(req.params.id);
      if (!Number.isFinite(orderId)) {
        return res.status(400).json({ message: "Invalid order id" });
      }

      const payments = await this.model.listPayments(orderId);
      res.json(payments);
    } catch (err) {
      console.error("PAYMENTS LIST ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async createPayment(req, res) {
    try {
      const orderId = Number(req.params.id);
      if (!Number.isFinite(orderId)) {
        return res.status(400).json({ message: "Invalid order id" });
      }

      const data = normalizePaymentInput(req.body);
      const errMsg = validatePaymentInput(data);
      if (errMsg) return res.status(400).json({ message: errMsg });

      const created = await this.model.createPayment(orderId, data);
      res.status(201).json(created);
    } catch (err) {
      console.error("PAYMENTS CREATE ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async deletePayment(req, res) {
    try {
      const paymentId = Number(req.params.paymentId);
      if (!Number.isFinite(paymentId)) {
        return res.status(400).json({ message: "Invalid payment id" });
      }

      const ok = await this.model.deletePayment(paymentId);
      if (!ok) return res.status(404).json({ message: "Not found" });

      res.json({ message: "Deleted" });
    } catch (err) {
      console.error("PAYMENTS DELETE ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }
}

module.exports = OrdersController;