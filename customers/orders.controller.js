const ALLOWED_STATUS = ["IN_SEWING", "READY_FOR_FITTING", "COMPLETED"];
const ALLOWED_TYPE = ["sale", "rental"];

function normalizeOrder(body) {
  return {
    customer_id: Number(body?.customer_id),
    dress_id: Number(body?.dress_id),
    order_type: String(body?.order_type || "").toLowerCase(),
    order_date: body?.order_date ? String(body.order_date) : "", // required
    return_date: body?.return_date ? String(body.return_date) : null,
    status: body?.status ? String(body.status) : "IN_SEWING",
  };
}

function validateOrder(o) {
  if (!Number.isFinite(o.customer_id)) return "customer_id is required";
  if (!Number.isFinite(o.dress_id)) return "dress_id is required";
  if (!ALLOWED_TYPE.includes(o.order_type)) return "order_type must be sale or rental";
  if (!o.order_date) return "order_date is required";
  if (!ALLOWED_STATUS.includes(o.status)) return "invalid status";

  if (o.order_type === "rental") {
    if (!o.return_date) return "return_date is required for rental";
    if (o.return_date < o.order_date) return "return_date must be after order_date";
  }
  return null;
}

class OrdersController {
  constructor(model) {
    this.model = model;
    this.list = this.list.bind(this);
    this.create = this.create.bind(this);
    this.updateStatus = this.updateStatus.bind(this);
  }

  async list(req, res) {
    try {
      const rows = await this.model.list({
        status: req.query.status || "",
        search: req.query.search || "",
      });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async create(req, res) {
    try {
      const o = normalizeOrder(req.body);
      const errMsg = validateOrder(o);
      if (errMsg) return res.status(400).json({ message: errMsg });

      const dress = await this.model.getDressPrices(o.dress_id);
      if (!dress) return res.status(400).json({ message: "Invalid dress_id" });

      let total_price = null;
      if (o.order_type === "sale") total_price = dress.sale_price;
      if (o.order_type === "rental") total_price = dress.rental_price;

      if (total_price === null || total_price === undefined) {
        return res.status(400).json({
          message: `Price is missing for this dress (${o.order_type}). Set sale_price/rental_price in dresses table.`,
        });
      }

      const created = await this.model.create({
        customer_id: o.customer_id,
        dress_id: o.dress_id,
        order_type: o.order_type,
        order_date: o.order_date,
        return_date: o.order_type === "rental" ? o.return_date : null,
        total_price: total_price,
        status: o.status,
      });

      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async updateStatus(req, res) {
    try {
      const order_id = Number(req.params.id);
      const status = String(req.body?.status || "");

      if (!Number.isFinite(order_id)) return res.status(400).json({ message: "Invalid id" });
      if (!ALLOWED_STATUS.includes(status)) return res.status(400).json({ message: "Invalid status" });

      const updated = await this.model.updateStatus(order_id, status);
      if (!updated) return res.status(404).json({ message: "Not found" });

      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }
}

module.exports = OrdersController;
