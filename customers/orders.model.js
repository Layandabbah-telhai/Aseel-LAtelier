class OrdersModel {
  constructor(dbPool) {
    this.db = dbPool;
    this.ordersTable = process.env.ORDERS_TABLE || "orders";
    this.customersTable = process.env.CUSTOMERS_TABLE || "customers";
    this.dressesTable = process.env.DRESSES_TABLE || "dresses";
  }

  async list({ status = "", search = "" } = {}) {
    const st = (status || "").trim();
    const s = (search || "").trim();

    const where = [];
    const params = [];

    if (st) {
      where.push("o.status = ?");
      params.push(st);
    }

    if (s) {
      const like = `%${s}%`;
      where.push("(c.first_name LIKE ? OR c.last_name LIKE ? OR c.phone LIKE ? OR d.dress_name LIKE ?)");
      params.push(like, like, like, like);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await this.db.query(
      `SELECT
         o.order_id, o.customer_id, o.dress_id,
         o.order_type, o.order_date, o.return_date,
         o.total_price, o.status,
         c.first_name, c.last_name, c.phone,
         d.dress_name
       FROM \`${this.ordersTable}\` o
       JOIN \`${this.customersTable}\` c ON c.customer_id = o.customer_id
       JOIN \`${this.dressesTable}\` d ON d.dress_id = o.dress_id
       ${whereSql}
       ORDER BY o.order_id DESC
       LIMIT 500`,
      params
    );

    return rows;
  }

  async getById(order_id) {
    const [rows] = await this.db.query(
      `SELECT order_id, customer_id, dress_id, order_type, order_date, return_date, total_price, status
       FROM \`${this.ordersTable}\`
       WHERE order_id = ?`,
      [order_id]
    );
    return rows[0] || null;
  }

  async getDressPrices(dress_id) {
    const [rows] = await this.db.query(
      `SELECT dress_id, sale_price, rental_price
       FROM \`${this.dressesTable}\`
       WHERE dress_id = ?`,
      [dress_id]
    );
    return rows[0] || null;
  }

  async create({ customer_id, dress_id, order_type, order_date, return_date, total_price, status }) {
    const [result] = await this.db.query(
      `INSERT INTO \`${this.ordersTable}\`
       (customer_id, dress_id, order_type, order_date, return_date, total_price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_id,
        dress_id,
        order_type,
        order_date,
        return_date ?? null,
        total_price,
        status,
      ]
    );
    return this.getById(result.insertId);
  }

  async updateStatus(order_id, status) {
    await this.db.query(
      `UPDATE \`${this.ordersTable}\` SET status = ? WHERE order_id = ?`,
      [status, order_id]
    );
    return this.getById(order_id);
  }
}

module.exports = OrdersModel;
