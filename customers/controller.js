function normalizeInput(body) {
  return {
    first_name: String(body?.first_name || "").trim(),
    last_name: String(body?.last_name || "").trim(),
    phone: String(body?.phone || "").trim(),
    event_date: body?.event_date ? String(body.event_date) : null,
    email: body?.email ? String(body.email).trim() : null,
  };
}

function validate(data) {
  if (!data.first_name) return "first_name is required";
  if (!data.last_name) return "last_name is required";
  if (!data.phone) return "phone is required";

  if (data.first_name.length > 50) return "first_name too long";
  if (data.last_name.length > 50) return "last_name too long";
  if (data.phone.length > 20) return "phone too long";
  if (data.email && data.email.length > 100) return "email too long";

  return null;
}

function isDuplicatePhoneError(err) {
  return String(err).includes("Duplicate entry") && String(err).includes("phone");
}

class customersController {
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
      const rows = await this.model.list({ search: req.query.search || "" });
      res.json(rows);
    } catch (err) {
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
      if (isDuplicatePhoneError(err)) {
        return res.status(409).json({ message: "Phone already exists" });
      }
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
      if (isDuplicatePhoneError(err)) {
        return res.status(409).json({ message: "Phone already exists" });
      }
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
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }
}

module.exports = customersController;
