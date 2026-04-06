class CustomersModel {
  constructor(dbPool) {
    this.db = dbPool;
    this.table = process.env.CUSTOMERS_TABLE || "customers";
  }

  async list({ search = "" } = {}) {
    const s = (search || "").trim();

    if (!s) {
      const [rows] = await this.db.query(
        `SELECT customer_id, first_name, last_name, city, phone, event_date, birth_date, email
         FROM \`${this.table}\`
         ORDER BY customer_id DESC
         LIMIT 200`
      );
      return rows;
    }

    const like = `%${s}%`;
    const [rows] = await this.db.query(
      `SELECT customer_id, first_name, last_name, city, phone, event_date, birth_date, email
       FROM \`${this.table}\`
       WHERE phone LIKE ?
          OR first_name LIKE ?
          OR last_name LIKE ?
          OR city LIKE ?
          OR email LIKE ?
       ORDER BY customer_id DESC
       LIMIT 200`,
      [like, like, like, like, like]
    );

    return rows;
  }

  async getById(customer_id) {
    const [rows] = await this.db.query(
      `SELECT customer_id, first_name, last_name, city, phone, event_date, birth_date, email
       FROM \`${this.table}\`
       WHERE customer_id = ?`,
      [customer_id]
    );
    return rows[0] || null;
  }

  async create({
    first_name,
    last_name,
    city,
    phone,
    event_date,
    birth_date,
    email,
  }) {
    const [result] = await this.db.query(
      `INSERT INTO \`${this.table}\`
       (first_name, last_name, city, phone, event_date, birth_date, email)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name,
        last_name,
        city || null,
        phone,
        event_date ?? null,
        birth_date ?? null,
        email ?? null,
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
      event_date,
      birth_date,
      email,
    }
  ) {
    await this.db.query(
      `UPDATE \`${this.table}\`
       SET first_name = ?,
           last_name = ?,
           city = ?,
           phone = ?,
           event_date = ?,
           birth_date = ?,
           email = ?
       WHERE customer_id = ?`,
      [
        first_name,
        last_name,
        city || null,
        phone,
        event_date ?? null,
        birth_date ?? null,
        email ?? null,
        customer_id,
      ]
    );

    return this.getById(customer_id);
  }

  async remove(customer_id) {
    const [result] = await this.db.query(
      `DELETE FROM \`${this.table}\` WHERE customer_id = ?`,
      [customer_id]
    );

    return result.affectedRows > 0;
  }
}

module.exports = CustomersModel;