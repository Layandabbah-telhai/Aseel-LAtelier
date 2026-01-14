function normalizeDress(body) {
  return {
    dress_name: String(body?.dress_name || "").trim(),
    size: body?.size ? String(body.size).trim() : null,
    color: body?.color ? String(body.color).trim() : null,
    status: String(body?.status || "").trim(), // required in DB
    rental_price: body?.rental_price === "" ? null : (body?.rental_price ?? null),
    sale_price: body?.sale_price === "" ? null : (body?.sale_price ?? null),
    notes: body?.notes ? String(body.notes) : null,
  };
}

function validateDress(d) {
  if (!d.dress_name) return "dress_name is required";
  if (d.dress_name.length > 100) return "dress_name too long";
  if (!d.status) return "status is required";
  if (d.status.length > 20) return "status too long";
  return null;
}

class DressesController {
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
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

      const row = await this.model.getById(id);
      if (!row) return res.status(404).json({ message: "Not found" });

      res.json(row);
    } catch (err) {
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async create(req, res) {
    try {
      const d = normalizeDress(req.body);
      const errMsg = validateDress(d);
      if (errMsg) return res.status(400).json({ message: errMsg });

      const created = await this.model.create(d);
      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async update(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

      const d = normalizeDress(req.body);
      const errMsg = validateDress(d);
      if (errMsg) return res.status(400).json({ message: errMsg });

      const updated = await this.model.update(id, d);
      if (!updated) return res.status(404).json({ message: "Not found" });

      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async remove(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

      const ok = await this.model.remove(id);
      if (!ok) return res.status(404).json({ message: "Not found" });

      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }
}

module.exports = DressesController;
