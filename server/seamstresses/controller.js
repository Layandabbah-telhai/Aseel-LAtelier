function normalizeSeamstressInput(body) {
  return {
    name: String(body?.name || "").trim(),
    phone: String(body?.phone || "").trim(),
    specialty: String(body?.specialty || "").trim(),
    notes: String(body?.notes || "").trim(),
  };
}

function normalizeAssignmentInput(body) {
  return {
    order_id: Number(body?.order_id),
    seamstress_id: Number(body?.seamstress_id),
    task_type: String(body?.task_type || "").trim(),
    notes: String(body?.notes || "").trim(),
  };
}

class SeamstressesController {
  constructor(model) {
    this.model = model;

    this.listSeamstresses = this.listSeamstresses.bind(this);
    this.getSeamstress = this.getSeamstress.bind(this);
    this.createSeamstress = this.createSeamstress.bind(this);
    this.updateSeamstress = this.updateSeamstress.bind(this);
    this.deleteSeamstress = this.deleteSeamstress.bind(this);

    this.listAssignments = this.listAssignments.bind(this);
    this.createAssignment = this.createAssignment.bind(this);
    this.updateAssignment = this.updateAssignment.bind(this);
    this.deleteAssignment = this.deleteAssignment.bind(this);
  }

  async listSeamstresses(req, res) {
    try {
      const rows = await this.model.listSeamstresses(req.query.search || "");
      res.json(rows);
    } catch (err) {
      console.error("SEAMSTRESSES LIST ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async getSeamstress(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: "Invalid id" });
      }

      const row = await this.model.getSeamstressById(id);
      if (!row) return res.status(404).json({ message: "Not found" });

      res.json(row);
    } catch (err) {
      console.error("SEAMSTRESSES GET ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async createSeamstress(req, res) {
    try {
      const data = normalizeSeamstressInput(req.body);

      if (!data.name) {
        return res.status(400).json({ message: "name is required" });
      }

      const created = await this.model.createSeamstress(data);
      res.status(201).json(created);
    } catch (err) {
      console.error("SEAMSTRESSES CREATE ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async updateSeamstress(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: "Invalid id" });
      }

      const data = normalizeSeamstressInput(req.body);

      if (!data.name) {
        return res.status(400).json({ message: "name is required" });
      }

      const updated = await this.model.updateSeamstress(id, data);
      if (!updated) return res.status(404).json({ message: "Not found" });

      res.json(updated);
    } catch (err) {
      console.error("SEAMSTRESSES UPDATE ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async deleteSeamstress(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: "Invalid id" });
      }

      const ok = await this.model.deleteSeamstress(id);
      if (!ok) return res.status(404).json({ message: "Not found" });

      res.json({ message: "Deleted" });
    } catch (err) {
      console.error("SEAMSTRESSES DELETE ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async listAssignments(req, res) {
    try {
      const rows = await this.model.listAssignments({
        order_id: req.query.order_id || null,
      });
      res.json(rows);
    } catch (err) {
      console.error("SEAMSTRESS ASSIGNMENTS LIST ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async createAssignment(req, res) {
    try {
      const data = normalizeAssignmentInput(req.body);

      if (!Number.isFinite(data.order_id)) {
        return res.status(400).json({ message: "order_id is required" });
      }

      if (!Number.isFinite(data.seamstress_id)) {
        return res.status(400).json({ message: "seamstress_id is required" });
      }

      const created = await this.model.createAssignment(data);
      res.status(201).json(created);
    } catch (err) {
      console.error("SEAMSTRESS ASSIGNMENT CREATE ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async updateAssignment(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: "Invalid id" });
      }

      const data = normalizeAssignmentInput(req.body);

      if (!Number.isFinite(data.order_id)) {
        return res.status(400).json({ message: "order_id is required" });
      }

      if (!Number.isFinite(data.seamstress_id)) {
        return res.status(400).json({ message: "seamstress_id is required" });
      }

      const updated = await this.model.updateAssignment(id, data);
      if (!updated) return res.status(404).json({ message: "Not found" });

      res.json(updated);
    } catch (err) {
      console.error("SEAMSTRESS ASSIGNMENT UPDATE ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }

  async deleteAssignment(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: "Invalid id" });
      }

      const ok = await this.model.deleteAssignment(id);
      if (!ok) return res.status(404).json({ message: "Not found" });

      res.json({ message: "Deleted" });
    } catch (err) {
      console.error("SEAMSTRESS ASSIGNMENT DELETE ERROR:", err);
      res.status(500).json({ message: "Server error", error: String(err) });
    }
  }
}

module.exports = SeamstressesController;