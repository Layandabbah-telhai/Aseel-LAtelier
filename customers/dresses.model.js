class DressesModel {
  constructor(dbPool) {
    this.db = dbPool;
    this.table = process.env.DRESSES_TABLE || "dresses";
  }

  async list({ search = "" } = {}) {
    const s = (search || "").trim();

    if (!s) {
      const [rows] = await this.db.query(
        `SELECT dress_id, dress_name, size, color, status, rental_price, sale_price, notes
         FROM \`${this.table}\`
         ORDER BY dress_id DESC
         LIMIT 500`
      );
      return rows;
    }

    const like = `%${s}%`;
    const [rows] = await this.db.query(
      `SELECT dress_id, dress_name, size, color, status, rental_price, sale_price, notes
       FROM \`${this.table}\`
       WHERE dress_name LIKE ? OR color LIKE ? OR size LIKE ? OR status LIKE ?
       ORDER BY dress_id DESC
       LIMIT 500`,
      [like, like, like, like]
    );
    return rows;
  }

  async getById(dress_id) {
    const [rows] = await this.db.query(
      `SELECT dress_id, dress_name, size, color, status, rental_price, sale_price, notes
       FROM \`${this.table}\`
       WHERE dress_id = ?`,
      [dress_id]
    );
    return rows[0] || null;
  }

  async create({ dress_name, size, color, status, rental_price, sale_price, notes }) {
    const [result] = await this.db.query(
      `INSERT INTO \`${this.table}\` (dress_name, size, color, status, rental_price, sale_price, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        dress_name,
        size ?? null,
        color ?? null,
        status,
        rental_price ?? null,
        sale_price ?? null,
        notes ?? null,
      ]
    );
    return this.getById(result.insertId);
  }

  async update(dress_id, { dress_name, size, color, status, rental_price, sale_price, notes }) {
    await this.db.query(
      `UPDATE \`${this.table}\`
       SET dress_name=?, size=?, color=?, status=?, rental_price=?, sale_price=?, notes=?
       WHERE dress_id=?`,
      [
        dress_name,
        size ?? null,
        color ?? null,
        status,
        rental_price ?? null,
        sale_price ?? null,
        notes ?? null,
        dress_id,
      ]
    );
    return this.getById(dress_id);
  }

  async remove(dress_id) {
    const [result] = await this.db.query(
      `DELETE FROM \`${this.table}\` WHERE dress_id = ?`,
      [dress_id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = DressesModel;
