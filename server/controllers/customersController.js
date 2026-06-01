class CustomersController {
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
      });

      res.json(rows);
    } catch (err) {
      console.error("CUSTOMERS LIST ERROR:", err);

      res.status(500).json({
        message: "Server error",
        error: String(err),
      });
    }
  }

  async get(req, res) {
    try {
      const id = Number(req.params.id);

      if (!Number.isFinite(id)) {
        return res.status(400).json({
          message: "Invalid customer id",
        });
      }

      const row =
        await this.model.getById(id);

      if (!row) {
        return res.status(404).json({
          message: "Customer not found",
        });
      }

      res.json(row);

    } catch (err) {

      console.error("CUSTOMER GET ERROR:", err);

      res.status(500).json({
        message: "Server error",
        error: String(err),
      });
    }
  }

  async create(req, res) {
    try {

      const {
        first_name,
        last_name,
        city,
        phone,
        birth_date,
        email,
      } = req.body || {};

      if (
        !first_name ||
        !last_name ||
        !phone
      ) {
        return res.status(400).json({
          message:
            "First name, last name and phone are required",
        });
      }

      const created =
        await this.model.create({
          first_name:
            String(first_name).trim(),

          last_name:
            String(last_name).trim(),

          city:
            city
              ? String(city).trim()
              : null,

          phone:
            String(phone).trim(),

          birth_date:
            birth_date || null,

          email:
            email
              ? String(email).trim()
              : null,
        });

      res.status(201).json(created);

    } catch (err) {

      console.error("CUSTOMER CREATE ERROR:", err);

      res.status(500).json({
        message: "Server error",
        error: String(err),
      });
    }
  }

  async update(req, res) {
    try {

      const id =
        Number(req.params.id);

      if (!Number.isFinite(id)) {
        return res.status(400).json({
          message: "Invalid customer id",
        });
      }

      const {
        first_name,
        last_name,
        city,
        phone,
        birth_date,
        email,
      } = req.body || {};

      if (
        !first_name ||
        !last_name ||
        !phone
      ) {
        return res.status(400).json({
          message:
            "First name, last name and phone are required",
        });
      }

      const updated =
        await this.model.update(id, {
          first_name:
            String(first_name).trim(),

          last_name:
            String(last_name).trim(),

          city:
            city
              ? String(city).trim()
              : null,

          phone:
            String(phone).trim(),

          birth_date:
            birth_date || null,

          email:
            email
              ? String(email).trim()
              : null,
        });

      if (!updated) {
        return res.status(404).json({
          message: "Customer not found",
        });
      }

      res.json(updated);

    } catch (err) {

      console.error("CUSTOMER UPDATE ERROR:", err);

      res.status(500).json({
        message: "Server error",
        error: String(err),
      });
    }
  }

  async remove(req, res) {
    try {

      const id =
        Number(req.params.id);

      if (!Number.isFinite(id)) {
        return res.status(400).json({
          message: "Invalid customer id",
        });
      }

      const ok =
        await this.model.remove(id);

      if (!ok) {
        return res.status(404).json({
          message: "Customer not found",
        });
      }

      res.json({
        message: "Customer deleted successfully",
      });

    } catch (err) {

      console.error("CUSTOMER DELETE ERROR:", err);

      res.status(500).json({
        message: "Server error",
        error: String(err),
      });
    }
  }
}

module.exports = CustomersController;