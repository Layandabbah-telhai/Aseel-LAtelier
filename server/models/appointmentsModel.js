class AppointmentsModel {
  constructor(dbPool) {
    this.db = dbPool;
    this.table = process.env.APPOINTMENTS_TABLE || "appointments";
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
      JOIN \`${this.customersTable}\` c ON c.customer_id = a.customer_id
      LEFT JOIN \`${this.ordersTable}\` o ON o.order_id = a.order_id
      LEFT JOIN \`${this.dressesTable}\` d ON d.dress_id = o.dress_id
      ${whereSql}
      ORDER BY a.appointment_date DESC, a.appointment_time DESC, a.appointment_id DESC
      LIMIT 500
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
      JOIN \`${this.customersTable}\` c ON c.customer_id = a.customer_id
      LEFT JOIN \`${this.ordersTable}\` o ON o.order_id = a.order_id
      LEFT JOIN \`${this.dressesTable}\` d ON d.dress_id = o.dress_id
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
      (customer_id, order_id, appointment_type, appointment_date, appointment_time, status, notes)
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
}

module.exports = AppointmentsModel;