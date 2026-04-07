function toNullableNumber(value) {
  if (value === "" || value === undefined || value === null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? NaN : n;
}

function normalizeInput(body) {
  return {
    customer_id: Number(body?.customer_id),
    order_id: Number(body?.order_id),
    tailoring_type: String(body?.tailoring_type || "").trim(),
    bust: toNullableNumber(body?.bust),
    waist: toNullableNumber(body?.waist),
    hips: toNullableNumber(body?.hips),
    shoulder: toNullableNumber(body?.shoulder),
    sleeve_length: toNullableNumber(body?.sleeve_length),
    dress_length: toNullableNumber(body?.dress_length),
    notes: String(body?.notes || "").trim(),
  };
}

function validateInput(data) {
  if (!Number.isFinite(data.customer_id)) return "customer_id is required";
  if (!Number.isFinite(data.order_id)) return "order_id is required";

  const numericFields = [
    "bust",
    "waist",
    "hips",
    "shoulder",
    "sleeve_length",
    "dress_length",
  ];

  for (const field of numericFields) {
    if (Number.isNaN(data[field])) {
      return `${field} must be a number`;
    }
  }

  if (data.tailoring_type.length > 50) return "tailoring_type too long";
  return null;
}

class MeasurementsController {
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
        order_id: req.query.order_id || null,
      });
      res.json(rows);
    } catch (err) {
      console.error("MEASUREMENTS LIST ERROR:", err);
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
      console.error("MEASUREMENTS GET ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async create(req, res) {
    try {
      const data = normalizeInput(req.body);
      const errMsg = validateInput(data);
      if (errMsg) return res.status(400).json({ message: errMsg });

      const created = await this.model.create(data);
      res.status(201).json(created);
    } catch (err) {
      console.error("MEASUREMENTS CREATE ERROR:", err);
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
      const errMsg = validateInput(data);
      if (errMsg) return res.status(400).json({ message: errMsg });

      const updated = await this.model.update(id, data);
      if (!updated) return res.status(404).json({ message: "Not found" });

      res.json(updated);
    } catch (err) {
      console.error("MEASUREMENTS UPDATE ERROR:", err);
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
      console.error("MEASUREMENTS DELETE ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }
}

module.exports = MeasurementsController;

