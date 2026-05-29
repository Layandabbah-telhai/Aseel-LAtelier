class OccasionRequestsController {
  constructor(occasionRequestsModel) {
    this.model = occasionRequestsModel;
  }

  createCustomerRequest = async (req, res) => {
    try {
      const {
        customer_id,
        occasion_type,
        event_date,
        order_type,
        notes,
      } = req.body || {};

      if (!customer_id || !occasion_type || !order_type) {
        return res.status(400).json({
          message: "Missing required fields",
        });
      }

      const result = await this.model.create({
        customer_id,
        occasion_type,
        event_date,
        order_type,
        notes,
      });

      res.status(201).json(result);
    } catch (err) {
      console.error("OCCASION REQUEST ERROR:", err);

      res.status(500).json({
        message: "Server error",
        error: String(err),
      });
    }
  };

  listCustomerRequests = async (req, res) => {
    try {
      const customerId = Number(req.params.customerId);

      if (!Number.isFinite(customerId)) {
        return res.status(400).json({
          message: "Invalid customer id",
        });
      }

      const rows = await this.model.listByCustomer(customerId);
      res.json(rows);
    } catch (err) {
      console.error("CUSTOMER OCCASION REQUESTS ERROR:", err);

      res.status(500).json({
        message: "Server error",
        error: String(err),
      });
    }
  };

  listAllRequests = async (req, res) => {
    try {
      const rows = await this.model.listAll();
      res.json(rows);
    } catch (err) {
      console.error("GET OCCASION REQUESTS ERROR:", err);

      res.status(500).json({
        message: "Server error",
        error: String(err),
      });
    }
  };

  updateStatus = async (req, res) => {
    try {
      const requestId = Number(req.params.id);
      const { status, admin_notes } = req.body || {};

      if (!Number.isFinite(requestId)) {
        return res.status(400).json({
          message: "Invalid request id",
        });
      }

      if (!status) {
        return res.status(400).json({
          message: "Status is required",
        });
      }

      const cleanStatus = String(status).trim().toLowerCase();

      if (!["accepted", "rejected"].includes(cleanStatus)) {
        return res.status(400).json({
          message: "Status must be accepted or rejected",
        });
      }

      const result = await this.model.decideRequest(
        requestId,
        cleanStatus,
        admin_notes || null
      );

      if (!result.ok) {
        return res.status(result.statusCode || 400).json({
          message: result.message,
        });
      }

      res.json(result);
    } catch (err) {
      console.error("UPDATE OCCASION REQUEST ERROR:", err);

      res.status(500).json({
        message: "Server error",
        error: String(err),
      });
    }
  };
}

module.exports = OccasionRequestsController;