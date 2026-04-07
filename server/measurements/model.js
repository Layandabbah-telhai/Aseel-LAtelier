class MeasurementsModel {
  constructor(dbPool) {
    this.db = dbPool;
    this.measurementsTable = process.env.MEASUREMENTS_TABLE || "measurements";
    this.customersTable = process.env.CUSTOMERS_TABLE || "customers";
    this.ordersTable = process.env.ORDERS_TABLE || "orders";
    this.dressesTable = process.env.DRESSES_TABLE || "dresses";
  }

  async list({ search = "", order_id = null } = {}) {
    const where = [];
    const params = [];

    if (Number.isFinite(Number(order_id))) {
      where.push("m.order_id = ?");
      params.push(Number(order_id));
    }

    const s = String(search || "").trim();
    if (s) {
      const like = `%${s}%`;
      where.push(`(
        c.first_name LIKE ? OR
        c.last_name LIKE ? OR
        c.phone LIKE ? OR
        d.dress_name LIKE ? OR
        o.occasion_type LIKE ? OR
        m.tailoring_type LIKE ?
      )`);
      params.push(like, like, like, like, like, like);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await this.db.query(
      `
      SELECT
        m.measurement_id,
        m.customer_id,
        m.order_id,
        m.tailoring_type,
        m.bust,
        m.waist,
        m.hips,
        m.shoulder,
        m.sleeve_length,
        m.dress_length,
        m.notes,
        c.first_name,
        c.last_name,
        c.phone,
        d.dress_name,
        o.occasion_type
      FROM \`${this.measurementsTable}\` m
      JOIN \`${this.customersTable}\` c ON c.customer_id = m.customer_id
      JOIN \`${this.ordersTable}\` o ON o.order_id = m.order_id
      LEFT JOIN \`${this.dressesTable}\` d ON d.dress_id = o.dress_id
      ${whereSql}
      ORDER BY m.measurement_id DESC
      LIMIT 500
      `,
      params
    );

    return rows.map(this.normalizeRow);
  }

  async getById(measurement_id) {
    const [rows] = await this.db.query(
      `
      SELECT
        m.measurement_id,
        m.customer_id,
        m.order_id,
        m.tailoring_type,
        m.bust,
        m.waist,
        m.hips,
        m.shoulder,
        m.sleeve_length,
        m.dress_length,
        m.notes,
        c.first_name,
        c.last_name,
        c.phone,
        d.dress_name,
        o.occasion_type
      FROM \`${this.measurementsTable}\` m
      JOIN \`${this.customersTable}\` c ON c.customer_id = m.customer_id
      JOIN \`${this.ordersTable}\` o ON o.order_id = m.order_id
      LEFT JOIN \`${this.dressesTable}\` d ON d.dress_id = o.dress_id
      WHERE m.measurement_id = ?
      `,
      [measurement_id]
    );

    return rows[0] ? this.normalizeRow(rows[0]) : null;
  }

  async create(data) {
    const [result] = await this.db.query(
      `
      INSERT INTO \`${this.measurementsTable}\`
      (
        customer_id,
        order_id,
        tailoring_type,
        bust,
        waist,
        hips,
        shoulder,
        sleeve_length,
        dress_length,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        data.customer_id,
        data.order_id,
        data.tailoring_type || null,
        data.bust,
        data.waist,
        data.hips,
        data.shoulder,
        data.sleeve_length,
        data.dress_length,
        data.notes || null,
      ]
    );

    return this.getById(result.insertId);
  }

  async update(measurement_id, data) {
    await this.db.query(
      `
      UPDATE \`${this.measurementsTable}\`
      SET
        customer_id = ?,
        order_id = ?,
        tailoring_type = ?,
        bust = ?,
        waist = ?,
        hips = ?,
        shoulder = ?,
        sleeve_length = ?,
        dress_length = ?,
        notes = ?
      WHERE measurement_id = ?
      `,
      [
        data.customer_id,
        data.order_id,
        data.tailoring_type || null,
        data.bust,
        data.waist,
        data.hips,
        data.shoulder,
        data.sleeve_length,
        data.dress_length,
        data.notes || null,
        measurement_id,
      ]
    );

    return this.getById(measurement_id);
  }

  async remove(measurement_id) {
    const [result] = await this.db.query(
      `DELETE FROM \`${this.measurementsTable}\` WHERE measurement_id = ?`,
      [measurement_id]
    );

    return result.affectedRows > 0;
  }

  normalizeRow(row) {
    return {
      ...row,
      bust: row.bust === null ? null : Number(row.bust),
      waist: row.waist === null ? null : Number(row.waist),
      hips: row.hips === null ? null : Number(row.hips),
      shoulder: row.shoulder === null ? null : Number(row.shoulder),
      sleeve_length: row.sleeve_length === null ? null : Number(row.sleeve_length),
      dress_length: row.dress_length === null ? null : Number(row.dress_length),
    };
  }
}

module.exports = MeasurementsModel;