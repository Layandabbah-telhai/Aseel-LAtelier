class CustomersModel {
  constructor(dbPool) {
    this.db = dbPool;
    this.table = process.env.CUSTOMERS_TABLE || "customers";
  }

  async list({ search = "" } = {}) {
    const s = (search || "").trim();

    const selectSql = `
      SELECT customer_id, first_name, last_name, city, phone, birth_date, email, source_type, source_details
      FROM \`${this.table}\`
    `;

    if (!s) {
      const [rows] = await this.db.query(`
        ${selectSql}
        ORDER BY customer_id DESC
        LIMIT 200
      `);
      return rows;
    }

    const like = `%${s}%`;
    const [rows] = await this.db.query(
      `
      ${selectSql}
      WHERE phone LIKE ?
         OR first_name LIKE ?
         OR last_name LIKE ?
         OR city LIKE ?
         OR email LIKE ?
         OR source_type LIKE ?
         OR source_details LIKE ?
      ORDER BY customer_id DESC
      LIMIT 200
      `,
      [like, like, like, like, like, like, like]
    );

    return rows;
  }

  async getById(customer_id) {
    const [rows] = await this.db.query(
      `
      SELECT customer_id, first_name, last_name, city, phone, birth_date, email, source_type, source_details
      FROM \`${this.table}\`
      WHERE customer_id = ?
      `,
      [customer_id]
    );

    return rows[0] || null;
  }

  async create({
    first_name,
    last_name,
    city,
    phone,
    birth_date,
    email,
    source_type,
    source_details,
  }) {
    const [result] = await this.db.query(
      `
      INSERT INTO \`${this.table}\`
      (first_name, last_name, city, phone, birth_date, email, source_type, source_details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        first_name,
        last_name,
        city || null,
        phone,
        birth_date || null,
        email || null,
        source_type || null,
        source_details || null,
      ]
    );

    return this.getById(result.insertId);
  }

  async update(
    customer_id,
    {
      first_name,
      last_name,
      city,
      phone,
      birth_date,
      email,
      source_type,
      source_details,
    }
  ) {
    await this.db.query(
      `
      UPDATE \`${this.table}\`
      SET
        first_name = ?,
        last_name = ?,
        city = ?,
        phone = ?,
        birth_date = ?,
        email = ?,
        source_type = ?,
        source_details = ?
      WHERE customer_id = ?
      `,
      [
        first_name,
        last_name,
        city || null,
        phone,
        birth_date || null,
        email || null,
        source_type || null,
        source_details || null,
        customer_id,
      ]
    );

    return this.getById(customer_id);
  }

  async remove(customer_id) {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      const [orders] = await connection.query(
        `SELECT order_id FROM \`orders\` WHERE customer_id = ?`,
        [customer_id]
      );

      const orderIds = orders.map((o) => o.order_id);

      if (orderIds.length) {
        const placeholders = orderIds.map(() => "?").join(",");

        await connection
          .query(`DELETE FROM \`payments\` WHERE order_id IN (${placeholders})`, orderIds)
          .catch((err) => {
            if (!["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(err.code)) throw err;
          });

        await connection
          .query(`DELETE FROM \`measurements\` WHERE order_id IN (${placeholders})`, orderIds)
          .catch((err) => {
            if (!["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(err.code)) throw err;
          });

        await connection
          .query(`DELETE FROM \`appointments\` WHERE order_id IN (${placeholders})`, orderIds)
          .catch((err) => {
            if (!["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(err.code)) throw err;
          });

        await connection
          .query(`DELETE FROM \`order_seamstresses\` WHERE order_id IN (${placeholders})`, orderIds)
          .catch((err) => {
            if (!["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(err.code)) throw err;
          });

        await connection.query(`DELETE FROM \`orders\` WHERE order_id IN (${placeholders})`, orderIds);
      }

      await connection
        .query(`DELETE FROM \`appointments\` WHERE customer_id = ?`, [customer_id])
        .catch((err) => {
          if (!["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(err.code)) throw err;
        });

      await connection
        .query(`DELETE FROM \`measurements\` WHERE customer_id = ?`, [customer_id])
        .catch((err) => {
          if (!["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(err.code)) throw err;
        });

      const [result] = await connection.query(
        `DELETE FROM \`${this.table}\` WHERE customer_id = ?`,
        [customer_id]
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
}

module.exports = CustomersModel;