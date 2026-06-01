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
        o.occasion_type LIKE ? OR
        o.customer_type LIKE ? OR
        o.venue_city LIKE ? OR
        o.venue_hall LIKE ?
      )`);

      params.push(like, like, like, like, like, like, like, like, like);
    }

    if (status.trim()) {
      where.push(`o.status = ?`);
      params.push(status.trim());
    }

    const whereSql = where.length
      ? `WHERE ${where.join(" AND ")}`
      : "";

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

        o.customer_type,
        o.venue_city,
        o.venue_hall,
        o.has_previous_experience,
        o.previous_experience_type,
        o.experience_rating,

        c.first_name,
        c.last_name,
        c.phone,

        d.dress_name,

        COALESCE(SUM(p.amount), 0) AS paid_amount

      FROM \`${this.ordersTable}\` o

      JOIN \`${this.customersTable}\` c
        ON c.customer_id = o.customer_id

      LEFT JOIN \`${this.dressesTable}\` d
        ON d.dress_id = o.dress_id

      LEFT JOIN \`${this.paymentsTable}\` p
        ON p.order_id = o.order_id

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

        o.customer_type,
        o.venue_city,
        o.venue_hall,
        o.has_previous_experience,
        o.previous_experience_type,
        o.experience_rating,

        c.first_name,
        c.last_name,
        c.phone,
        d.dress_name

      ORDER BY o.order_id DESC
      LIMIT 500
      `,
      params
    );

    return rows.map((row) => {
      const paidAmount = Number(row.paid_amount || 0);
      const totalPrice = Number(row.total_price || 0);

      return {
        ...row,

        dress_name: row.dress_name || "Not assigned yet",

        paid_amount: paidAmount,
        total_price: totalPrice,

        has_previous_experience: Boolean(row.has_previous_experience),

        payment_status:
          paidAmount <= 0
            ? "unpaid"
            : paidAmount < totalPrice
              ? "partial"
              : "paid",
      };
    });
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

        o.customer_type,
        o.venue_city,
        o.venue_hall,
        o.has_previous_experience,
        o.previous_experience_type,
        o.experience_rating,

        COALESCE(SUM(p.amount), 0) AS paid_amount

      FROM \`${this.ordersTable}\` o

      LEFT JOIN \`${this.paymentsTable}\` p
        ON p.order_id = o.order_id

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
        o.status,

        o.customer_type,
        o.venue_city,
        o.venue_hall,
        o.has_previous_experience,
        o.previous_experience_type,
        o.experience_rating
      `,
      [order_id]
    );

    const row = rows[0] || null;

    if (!row) return null;

    const paidAmount = Number(row.paid_amount || 0);
    const totalPrice = Number(row.total_price || 0);

    return {
      ...row,

      paid_amount: paidAmount,
      total_price: totalPrice,

      has_previous_experience: Boolean(row.has_previous_experience),

      payment_status:
        paidAmount <= 0
          ? "unpaid"
          : paidAmount < totalPrice
            ? "partial"
            : "paid",
    };
  }

  async create(data) {
    const [result] = await this.db.query(
      `
      INSERT INTO \`${this.ordersTable}\`
      (
        customer_id,
        dress_id,
        order_type,
        occasion_type,
        order_date,
        return_date,
        total_price,
        status,

        customer_type,
        venue_city,
        venue_hall,
        has_previous_experience,
        previous_experience_type,
        experience_rating
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        data.customer_id,
        data.dress_id || null,
        data.order_type,
        data.occasion_type || null,
        data.order_date,
        data.return_date || null,
        data.total_price,
        data.status,

        data.customer_type || null,
        data.venue_city || null,
        data.venue_hall || null,
        data.has_previous_experience ? 1 : 0,
        data.previous_experience_type || null,
        data.experience_rating || null,
      ]
    );

    return this.getById(result.insertId);
  }

  async update(order_id, data) {
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
        status = ?,

        customer_type = ?,
        venue_city = ?,
        venue_hall = ?,
        has_previous_experience = ?,
        previous_experience_type = ?,
        experience_rating = ?
      WHERE order_id = ?
      `,
      [
        data.customer_id,
        data.dress_id || null,
        data.order_type,
        data.occasion_type || null,
        data.order_date,
        data.return_date || null,
        data.total_price,
        data.status,

        data.customer_type || null,
        data.venue_city || null,
        data.venue_hall || null,
        data.has_previous_experience ? 1 : 0,
        data.previous_experience_type || null,
        data.experience_rating || null,

        order_id,
      ]
    );

    return this.getById(order_id);
  }

  async remove(order_id) {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      await connection
        .query(
          `DELETE FROM \`${this.paymentsTable}\` WHERE order_id = ?`,
          [order_id]
        )
        .catch((err) => {
          if (!["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR", "ER_BAD_TABLE_ERROR"].includes(err.code)) {
            throw err;
          }
        });

      await connection
        .query(
          `DELETE FROM \`measurements\` WHERE order_id = ?`,
          [order_id]
        )
        .catch((err) => {
          if (!["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR", "ER_BAD_TABLE_ERROR"].includes(err.code)) {
            throw err;
          }
        });

      await connection
        .query(
          `DELETE FROM \`appointments\` WHERE order_id = ?`,
          [order_id]
        )
        .catch((err) => {
          if (!["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR", "ER_BAD_TABLE_ERROR"].includes(err.code)) {
            throw err;
          }
        });

      await connection
        .query(
          `DELETE FROM \`order_seamstresses\` WHERE order_id = ?`,
          [order_id]
        )
        .catch((err) => {
          if (!["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR", "ER_BAD_TABLE_ERROR"].includes(err.code)) {
            throw err;
          }
        });

      const [result] = await connection.query(
        `DELETE FROM \`${this.ordersTable}\` WHERE order_id = ?`,
        [order_id]
      );

      await connection.commit();

      return result.affectedRows > 0;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async listPayments(order_id) {
    const [rows] = await this.db.query(
      `
      SELECT
        p.payment_id,
        p.order_id,
        p.payment_date,
        p.amount,
        p.payment_method,
        p.notes,
        p.due_date,
        p.reference_number,
        p.payment_status,

        c.first_name,
        c.last_name

      FROM \`${this.paymentsTable}\` p

      JOIN \`${this.ordersTable}\` o
        ON o.order_id = p.order_id

      JOIN \`${this.customersTable}\` c
        ON c.customer_id = o.customer_id

      WHERE p.order_id = ?

      ORDER BY p.payment_date DESC, p.payment_id DESC
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
      (
        order_id,
        payment_date,
        amount,
        payment_method,
        notes,
        due_date,
        reference_number,
        payment_status
      )
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

  async updatePayment(payment_id, payment) {
    await this.db.query(
      `
      UPDATE \`${this.paymentsTable}\`
      SET
        payment_date = ?,
        amount = ?,
        payment_method = ?,
        notes = ?,
        due_date = ?,
        reference_number = ?,
        payment_status = ?
      WHERE payment_id = ?
      `,
      [
        payment.payment_date,
        payment.amount,
        payment.payment_method || null,
        payment.notes || null,
        payment.due_date || null,
        payment.reference_number || null,
        payment.payment_status || "Paid",
        payment_id,
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
      [payment_id]
    );

    const row = rows[0];

    if (!row) return null;

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