function normalizeDressInput(body) {
  const imageUrls = Array.isArray(body?.image_urls)
    ? body.image_urls.map((v) => String(v || "").trim()).filter(Boolean)
    : [];

  return {
    dress_name: String(body?.dress_name || "").trim(),
    size: String(body?.size || "").trim(),
    color: String(body?.color || "").trim(),
    status: String(body?.status || "").trim(),
    rental_price:
      body?.rental_price === "" || body?.rental_price === undefined
        ? null
        : Number(body.rental_price),
    sale_price:
      body?.sale_price === "" || body?.sale_price === undefined
        ? null
        : Number(body.sale_price),
    notes: String(body?.notes || "").trim(),
    image_url: String(body?.image_url || "").trim(),
    image_urls: imageUrls,
  };
}

function validateDressInput(data) {
  if (!data.dress_name) return "dress_name is required";
  if (!data.status) return "status is required";

  if (data.dress_name.length > 100) return "dress_name too long";
  if (data.size.length > 10) return "size too long";
  if (data.color.length > 30) return "color too long";
  if (data.status.length > 20) return "status too long";

  if (data.rental_price !== null && Number.isNaN(data.rental_price)) {
    return "rental_price must be a number";
  }

  if (data.sale_price !== null && Number.isNaN(data.sale_price)) {
    return "sale_price must be a number";
  }

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
      console.error("DRESSES LIST ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async get(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: "Invalid id" });
      }

      const dress = await this.model.getById(id);
      if (!dress) return res.status(404).json({ message: "Not found" });

      res.json(dress);
    } catch (err) {
      console.error("DRESSES GET ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async create(req, res) {
    try {
      const data = normalizeDressInput(req.body);
      const errMsg = validateDressInput(data);
      if (errMsg) return res.status(400).json({ message: errMsg });

      const created = await this.model.create(data);
      res.status(201).json(created);
    } catch (err) {
      console.error("DRESSES CREATE ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async update(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: "Invalid id" });
      }

      const data = normalizeDressInput(req.body);
      const errMsg = validateDressInput(data);
      if (errMsg) return res.status(400).json({ message: errMsg });

      const updated = await this.model.update(id, data);
      if (!updated) return res.status(404).json({ message: "Not found" });

      res.json(updated);
    } catch (err) {
      console.error("DRESSES UPDATE ERROR:", err);
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
      console.error("DRESSES DELETE ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }
}

module.exports = DressesController;