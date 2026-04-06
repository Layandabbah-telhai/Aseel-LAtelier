class OrdersModel {
  constructor(dbPool) {
    this.db = dbPool;
    this.ordersTable = process.env.ORDERS_TABLE || "orders";
    this.customersTable = process.env.CUSTOMERS_TABLE || "customers";
    this.dressesTable = process.env.DRESSES_TABLE || "dresses";
    this.paymentsTable = process.env.PAYMENTS_TABLE || "payments";
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
        d.dress_name LIKE ? OR
        o.order_type LIKE ? OR
        o.occasion_type LIKE ?
      )`);
      params.push(like, like, like, like, like, like);
    }

    if (status.trim()) {
      where.push(`o.status = ?`);
      params.push(status.trim());
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await this.db.query(
      `
      SELECT
        o.order_id,
        o.customer_id,
        o.dress_id,
        o.order_type,
        o.occasion_type,
        o.order_date,
        o.return_date,
        o.total_price,
        o.status,
        c.first_name,
        c.last_name,
        c.phone,
        d.dress_name,
        COALESCE(SUM(p.amount), 0) AS paid_amount
      FROM \`${this.ordersTable}\` o
      JOIN \`${this.customersTable}\` c ON c.customer_id = o.customer_id
      JOIN \`${this.dressesTable}\` d ON d.dress_id = o.dress_id
      LEFT JOIN \`${this.paymentsTable}\` p ON p.order_id = o.order_id
      ${whereSql}
      GROUP BY
        o.order_id,
        o.customer_id,
        o.dress_id,
        o.order_type,
        o.occasion_type,
        o.order_date,
        o.return_date,
        o.total_price,
        o.status,
        c.first_name,
        c.last_name,
        c.phone,
        d.dress_name
      ORDER BY o.order_id DESC
      LIMIT 500
      `,
      params
    );

    return rows.map((row) => ({
      ...row,
      paid_amount: Number(row.paid_amount || 0),
      total_price: Number(row.total_price || 0),
      payment_status:
        Number(row.paid_amount || 0) <= 0
          ? "unpaid"
          : Number(row.paid_amount || 0) < Number(row.total_price || 0)
          ? "partial"
          : "paid",
    }));
  }

  async getById(order_id) {
    const [rows] = await this.db.query(
      `
      SELECT
        o.order_id,
        o.customer_id,
        o.dress_id,
        o.order_type,
        o.occasion_type,
        o.order_date,
        o.return_date,
        o.total_price,
        o.status,
        COALESCE(SUM(p.amount), 0) AS paid_amount
      FROM \`${this.ordersTable}\` o
      LEFT JOIN \`${this.paymentsTable}\` p ON p.order_id = o.order_id
      WHERE o.order_id = ?
      GROUP BY
        o.order_id,
        o.customer_id,
        o.dress_id,
        o.order_type,
        o.occasion_type,
        o.order_date,
        o.return_date,
        o.total_price,
        o.status
      `,
      [order_id]
    );

    const row = rows[0] || null;
    if (!row) return null;

    return {
      ...row,
      paid_amount: Number(row.paid_amount || 0),
      total_price: Number(row.total_price || 0),
      payment_status:
        Number(row.paid_amount || 0) <= 0
          ? "unpaid"
          : Number(row.paid_amount || 0) < Number(row.total_price || 0)
          ? "partial"
          : "paid",
    };
  }

  async create({
    customer_id,
    dress_id,
    order_type,
    occasion_type,
    order_date,
    return_date,
    total_price,
    status,
  }) {
    const [result] = await this.db.query(
      `
      INSERT INTO \`${this.ordersTable}\`
      (customer_id, dress_id, order_type, occasion_type, order_date, return_date, total_price, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        customer_id,
        dress_id,
        order_type,
        occasion_type || null,
        order_date,
        return_date || null,
        total_price,
        status,
      ]
    );

    return this.getById(result.insertId);
  }

  async update(
    order_id,
    {
      customer_id,
      dress_id,
      order_type,
      occasion_type,
      order_date,
      return_date,
      total_price,
      status,
    }
  ) {
    await this.db.query(
      `
      UPDATE \`${this.ordersTable}\`
      SET
        customer_id = ?,
        dress_id = ?,
        order_type = ?,
        occasion_type = ?,
        order_date = ?,
        return_date = ?,
        total_price = ?,
        status = ?
      WHERE order_id = ?
      `,
      [
        customer_id,
        dress_id,
        order_type,
        occasion_type || null,
        order_date,
        return_date || null,
        total_price,
        status,
        order_id,
      ]
    );

    return this.getById(order_id);
  }

  async remove(order_id) {
    await this.db.query(
      `DELETE FROM \`${this.paymentsTable}\` WHERE order_id = ?`,
      [order_id]
    );

    const [result] = await this.db.query(
      `DELETE FROM \`${this.ordersTable}\` WHERE order_id = ?`,
      [order_id]
    );

    return result.affectedRows > 0;
  }

  async listPayments(order_id) {
    const [rows] = await this.db.query(
      `
      SELECT
        payment_id,
        order_id,
        payment_date,
        amount,
        payment_method,
        notes,
        due_date,
        reference_number,
        payment_status
      FROM \`${this.paymentsTable}\`
      WHERE order_id = ?
      ORDER BY payment_date DESC, payment_id DESC
      `,
      [order_id]
    );

    return rows.map((row) => ({
      ...row,
      amount: Number(row.amount || 0),
    }));
  }

  async createPayment(order_id, payment) {
    const [result] = await this.db.query(
      `
      INSERT INTO \`${this.paymentsTable}\`
      (order_id, payment_date, amount, payment_method, notes, due_date, reference_number, payment_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        order_id,
        payment.payment_date,
        payment.amount,
        payment.payment_method || null,
        payment.notes || null,
        payment.due_date || null,
        payment.reference_number || null,
        payment.payment_status || "Paid",
      ]
    );

    const [rows] = await this.db.query(
      `
      SELECT
        payment_id,
        order_id,
        payment_date,
        amount,
        payment_method,
        notes,
        due_date,
        reference_number,
        payment_status
      FROM \`${this.paymentsTable}\`
      WHERE payment_id = ?
      `,
      [result.insertId]
    );

    const row = rows[0];
    return {
      ...row,
      amount: Number(row.amount || 0),
    };
  }

  async deletePayment(payment_id) {
    const [result] = await this.db.query(
      `DELETE FROM \`${this.paymentsTable}\` WHERE payment_id = ?`,
      [payment_id]
    );

    return result.affectedRows > 0;
  }
}

module.exports = OrdersModel;