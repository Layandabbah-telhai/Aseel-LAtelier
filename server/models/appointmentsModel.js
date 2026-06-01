class AppointmentsModel {
  constructor(dbPool) {
    this.db = dbPool;
    this.table = process.env.APPOINTMENTS_TABLE || "appointments";
    this.changeRequestsTable = "appointment_change_requests";
    this.customersTable = process.env.CUSTOMERS_TABLE || "customers";
    this.ordersTable = process.env.ORDERS_TABLE || "orders";
    this.dressesTable = process.env.DRESSES_TABLE || "dresses";
  }

  async list({ search = "", status = "" } = {}) {
    const where = [];
    const params = [];

    if (search.trim()) {
      const like = `%${search.trim()}%`;

      where.push(`(
        c.first_name LIKE ? OR
        c.last_name LIKE ? OR
        c.phone LIKE ? OR
        a.appointment_type LIKE ? OR
        a.status LIKE ? OR
        o.occasion_type LIKE ? OR
        d.dress_name LIKE ?
      )`);

      params.push(like, like, like, like, like, like, like);
    }

    if (status.trim()) {
      where.push(`a.status = ?`);
      params.push(status.trim());
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const [rows] = await this.db.query(
      `
  SELECT
    r.request_id,
    r.appointment_id,
    r.customer_id,
    r.order_id,
    r.\`current_date\`,
    r.\`current_time\`,
    r.requested_date,
    r.requested_time,
    r.reason,
    r.status,
    r.created_at,
    r.decided_at,

    c.first_name,
    c.last_name,
    c.phone,
    c.email,

    a.appointment_type,
    a.appointment_date,
    a.appointment_time,

    o.order_type,
    o.occasion_type,

    d.dress_name

  FROM \`${this.changeRequestsTable}\` r

  JOIN \`${this.customersTable}\` c
    ON c.customer_id = r.customer_id

  JOIN \`${this.table}\` a
    ON a.appointment_id = r.appointment_id

  JOIN \`${this.ordersTable}\` o
    ON o.order_id = r.order_id

  LEFT JOIN \`${this.dressesTable}\` d
    ON d.dress_id = o.dress_id

  ${whereSql}

  ORDER BY
    CASE r.status
      WHEN 'pending' THEN 1
      WHEN 'accepted' THEN 2
      WHEN 'rejected' THEN 3
      ELSE 4
    END,
    r.created_at DESC
  `,
      params
    );

    return rows;
  }

  async getById(appointment_id) {
    const [rows] = await this.db.query(
      `
      SELECT
        a.appointment_id,
        a.customer_id,
        a.order_id,
        a.appointment_type,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.notes,
        c.first_name,
        c.last_name,
        c.phone,
        o.order_type,
        o.occasion_type,
        d.dress_name
      FROM \`${this.table}\` a
      JOIN \`${this.customersTable}\` c
        ON c.customer_id = a.customer_id
      LEFT JOIN \`${this.ordersTable}\` o
        ON o.order_id = a.order_id
      LEFT JOIN \`${this.dressesTable}\` d
        ON d.dress_id = o.dress_id
      WHERE a.appointment_id = ?
      `,
      [appointment_id]
    );

    return rows[0] || null;
  }

  async create({
    customer_id,
    order_id,
    appointment_type,
    appointment_date,
    appointment_time,
    status,
    notes,
  }) {
    const [result] = await this.db.query(
      `
      INSERT INTO \`${this.table}\`
      (
        customer_id,
        order_id,
        appointment_type,
        appointment_date,
        appointment_time,
        status,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        customer_id,
        order_id || null,
        appointment_type,
        appointment_date,
        appointment_time || null,
        status,
        notes || null,
      ]
    );

    return this.getById(result.insertId);
  }

  async update(
    appointment_id,
    {
      customer_id,
      order_id,
      appointment_type,
      appointment_date,
      appointment_time,
      status,
      notes,
    }
  ) {
    await this.db.query(
      `
      UPDATE \`${this.table}\`
      SET
        customer_id = ?,
        order_id = ?,
        appointment_type = ?,
        appointment_date = ?,
        appointment_time = ?,
        status = ?,
        notes = ?
      WHERE appointment_id = ?
      `,
      [
        customer_id,
        order_id || null,
        appointment_type,
        appointment_date,
        appointment_time || null,
        status,
        notes || null,
        appointment_id,
      ]
    );

    return this.getById(appointment_id);
  }

  async remove(appointment_id) {
    const [result] = await this.db.query(
      `DELETE FROM \`${this.table}\` WHERE appointment_id = ?`,
      [appointment_id]
    );

    return result.affectedRows > 0;
  }

  async createChangeRequest({
    appointment_id,
    customer_id,
    order_id,
    requested_date,
    requested_time,
    reason,
  }) {
    const [[appointment]] = await this.db.query(
      `
      SELECT
        appointment_id,
        appointment_date,
        appointment_time
      FROM \`${this.table}\`
      WHERE appointment_id = ?
      `,
      [appointment_id]
    );

    if (!appointment) {
      const err = new Error("Appointment not found");
      err.status = 404;
      throw err;
    }

    const [existingPending] = await this.db.query(
      `
      SELECT request_id
      FROM \`${this.changeRequestsTable}\`
      WHERE appointment_id = ?
        AND status = 'pending'
      LIMIT 1
      `,
      [appointment_id]
    );

    if (existingPending.length) {
      const err = new Error(
        "There is already a pending change request for this appointment."
      );
      err.status = 400;
      throw err;
    }

    const [result] = await this.db.query(
      `
      INSERT INTO \`${this.changeRequestsTable}\`
      (
        appointment_id,
        customer_id,
        order_id,
        \`current_date\`,
        \`current_time\`,
        requested_date,
        requested_time,
        reason,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        appointment_id,
        customer_id,
        order_id,
        appointment.appointment_date || null,
        appointment.appointment_time || null,
        requested_date,
        requested_time,
        reason || null,
        "pending",
      ]
    );

    return this.getChangeRequestById(result.insertId);
  }

  async listChangeRequests({ status = "" } = {}) {
    const where = [];
    const params = [];

    if (status.trim()) {
      where.push("r.status = ?");
      params.push(status.trim());
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await this.db.query(
      `
      SELECT
        r.request_id,
        r.appointment_id,
        r.customer_id,
        r.order_id,
        r.\`current_date\` AS current_appointment_date,
        r.\`current_time\` AS current_appointment_time,
        r.requested_date,
        r.requested_time,
        r.reason,
        r.status,
        r.created_at,
        r.decided_at,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        a.appointment_type,
        a.appointment_date,
        a.appointment_time,
        o.order_type,
        o.occasion_type,
        d.dress_name
      FROM \`${this.changeRequestsTable}\` r
      JOIN \`${this.customersTable}\` c
        ON c.customer_id = r.customer_id
      JOIN \`${this.table}\` a
        ON a.appointment_id = r.appointment_id
      JOIN \`${this.ordersTable}\` o
        ON o.order_id = r.order_id
      LEFT JOIN \`${this.dressesTable}\` d
        ON d.dress_id = o.dress_id
      ${whereSql}
      ORDER BY
        CASE r.status
          WHEN 'pending' THEN 1
          WHEN 'accepted' THEN 2
          WHEN 'rejected' THEN 3
          ELSE 4
        END,
        r.created_at DESC
      `,
      params
    );

    return rows;
  }

  async getChangeRequestById(request_id) {
    const [rows] = await this.db.query(
      `
      SELECT
        request_id,
        appointment_id,
        customer_id,
        order_id,
        \`current_date\`,
        \`current_time\`,
        requested_date,
        requested_time,
        reason,
        status,
        created_at,
        decided_at
      FROM \`${this.changeRequestsTable}\`
      WHERE request_id = ?
      `,
      [request_id]
    );

    return rows[0] || null;
  }

  async decideChangeRequest(request_id, status) {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      const [[request]] = await connection.query(
        `
        SELECT
          request_id,
          appointment_id,
          requested_date,
          requested_time,
          status
        FROM \`${this.changeRequestsTable}\`
        WHERE request_id = ?
        FOR UPDATE
        `,
        [request_id]
      );

      if (!request) {
        const err = new Error("Request not found");
        err.status = 404;
        throw err;
      }

      if (request.status !== "pending") {
        const err = new Error("Request already decided");
        err.status = 400;
        throw err;
      }

      if (status === "accepted") {
        await connection.query(
          `
          UPDATE \`${this.table}\`
          SET
            appointment_date = ?,
            appointment_time = ?
          WHERE appointment_id = ?
          `,
          [
            request.requested_date,
            request.requested_time,
            request.appointment_id,
          ]
        );
      }

      await connection.query(
        `
        UPDATE \`${this.changeRequestsTable}\`
        SET
          status = ?,
          decided_at = CURRENT_TIMESTAMP
        WHERE request_id = ?
        `,
        [status, request_id]
      );

      await connection.commit();

      return this.getChangeRequestById(request_id);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}

module.exports = AppointmentsModel;