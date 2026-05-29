class OccasionRequestsModel {
  constructor(dbPool) {
    this.db = dbPool;

    this.requestsTable = "occasion_requests";
    this.customersTable = "customers";
    this.ordersTable = "orders";
  }

  async create(data) {
    const [result] = await this.db.query(
      `
      INSERT INTO ${this.requestsTable}
      (
        customer_id,
        occasion_type,
        event_date,
        order_type,
        notes,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        Number(data.customer_id),
        data.occasion_type,
        data.event_date || null,
        data.order_type,
        data.notes || null,
        "pending",
      ]
    );

    return {
      request_id: result.insertId,
      message: "Occasion request submitted successfully",
    };
  }

  async listByCustomer(customerId) {
    const [rows] = await this.db.query(
      `
      SELECT
        request_id,
        customer_id,
        occasion_type,
        event_date,
        order_type,
        notes,
        status,
        admin_notes,
        created_at
      FROM ${this.requestsTable}
      WHERE customer_id = ?
      ORDER BY created_at DESC
      `,
      [Number(customerId)]
    );

    return rows;
  }

  async listAll() {
    const [rows] = await this.db.query(
      `
      SELECT
        r.request_id,
        r.customer_id,
        r.occasion_type,
        r.event_date,
        r.order_type,
        r.notes,
        r.status,
        r.admin_notes,
        r.created_at,
        c.first_name,
        c.last_name,
        c.phone,
        c.email
      FROM ${this.requestsTable} r
      LEFT JOIN ${this.customersTable} c
        ON c.customer_id = r.customer_id
      ORDER BY r.created_at DESC
      `
    );

    return rows;
  }

  async decideRequest(requestId, status, adminNotes) {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      const cleanStatus = String(status || "").trim().toLowerCase();

      const [requestRows] = await connection.query(
        `
        SELECT
          request_id,
          customer_id,
          occasion_type,
          event_date,
          order_type,
          status
        FROM ${this.requestsTable}
        WHERE request_id = ?
        LIMIT 1
        `,
        [Number(requestId)]
      );

      if (!requestRows.length) {
        await connection.rollback();
        return {
          ok: false,
          statusCode: 404,
          message: "Request not found",
        };
      }

      const request = requestRows[0];

      if (String(request.status).toLowerCase() !== "pending") {
        await connection.rollback();
        return {
          ok: false,
          statusCode: 400,
          message: "This request was already decided",
        };
      }

      let createdOrderId = null;

      if (cleanStatus === "accepted") {
        const orderType =
          String(request.order_type).toLowerCase() === "rental"
            ? "rental"
            : "sale";

        const [orderResult] = await connection.query(
          `
          INSERT INTO ${this.ordersTable}
          (
            customer_id,
            dress_id,
            order_type,
            occasion_type,
            order_date,
            return_date,
            total_price,
            status
          )
          VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?)
          `,
          [
            Number(request.customer_id),
            null,
            orderType,
            request.occasion_type,
            orderType === "rental" ? request.event_date || null : null,
            0,
            "pending",
          ]
        );

        createdOrderId = orderResult.insertId;
      }

      await connection.query(
        `
        UPDATE ${this.requestsTable}
        SET
          status = ?,
          admin_notes = ?
        WHERE request_id = ?
        `,
        [cleanStatus, adminNotes || null, Number(requestId)]
      );

      await connection.commit();

      return {
        ok: true,
        message:
          cleanStatus === "accepted"
            ? "Request accepted and order created successfully"
            : "Request rejected successfully",
        order_id: createdOrderId,
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}

module.exports = OccasionRequestsModel;