const ALLOWED_APPOINTMENT_TYPES = [
  "Consultation",
  "First Fitting",
  "Second Fitting",
  "Delivery",
  "Pickup",
  "Custom",
];

const ALLOWED_APPOINTMENT_STATUS = [
  "Scheduled",
  "Completed",
  "Cancelled",
  "Missed",
];

function normalizeInput(body) {
  return {
    customer_id: Number(body?.customer_id),
    order_id:
      body?.order_id === "" || body?.order_id === undefined || body?.order_id === null
        ? null
        : Number(body.order_id),
    appointment_type: String(body?.appointment_type || "").trim(),
    appointment_date: String(body?.appointment_date || "").trim(),
    appointment_time: body?.appointment_time ? String(body.appointment_time).trim() : null,
    status: String(body?.status || "Scheduled").trim(),
    notes: String(body?.notes || "").trim(),
  };
}

function validate(data) {
  if (!Number.isFinite(data.customer_id)) return "customer_id is required";
  if (data.order_id !== null && !Number.isFinite(data.order_id)) return "order_id is invalid";
  if (!ALLOWED_APPOINTMENT_TYPES.includes(data.appointment_type)) {
    return "invalid appointment_type";
  }
  if (!data.appointment_date) return "appointment_date is required";
  if (!ALLOWED_APPOINTMENT_STATUS.includes(data.status)) {
    return "invalid status";
  }
  if (data.notes.length > 2000) return "notes too long";

  return null;
}

class AppointmentsController {
  constructor(model) {
    this.model = model;

    this.list = this.list.bind(this);
    this.get = this.get.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.remove = this.remove.bind(this);
  }

  async list(req, res) {
    try {
      const rows = await this.model.list({
        search: req.query.search || "",
        status: req.query.status || "",
      });
      res.json(rows);
    } catch (err) {
      console.error("APPOINTMENTS LIST ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async get(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: "Invalid id" });
      }

      const row = await this.model.getById(id);
      if (!row) return res.status(404).json({ message: "Not found" });

      res.json(row);
    } catch (err) {
      console.error("APPOINTMENTS GET ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async create(req, res) {
    try {
      const data = normalizeInput(req.body);
      const errMsg = validate(data);
      if (errMsg) return res.status(400).json({ message: errMsg });

      const created = await this.model.create(data);
      res.status(201).json(created);
    } catch (err) {
      console.error("APPOINTMENTS CREATE ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async update(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: "Invalid id" });
      }

      const data = normalizeInput(req.body);
      const errMsg = validate(data);
      if (errMsg) return res.status(400).json({ message: errMsg });

      const updated = await this.model.update(id, data);
      if (!updated) return res.status(404).json({ message: "Not found" });

      res.json(updated);
    } catch (err) {
      console.error("APPOINTMENTS UPDATE ERROR:", err);
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
      console.error("APPOINTMENTS DELETE ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }
}

module.exports = AppointmentsController;