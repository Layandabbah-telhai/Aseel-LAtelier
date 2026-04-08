class SeamstressesModel {
  constructor(dbPool) {
    this.db = dbPool;
    this.seamstressesTable = process.env.SEAMSTRESSES_TABLE || "seamstresses";
    this.assignmentsTable = process.env.ORDER_SEAMSTRESSES_TABLE || "order_seamstresses";
    this.ordersTable = process.env.ORDERS_TABLE || "orders";
    this.customersTable = process.env.CUSTOMERS_TABLE || "customers";
    this.dressesTable = process.env.DRESSES_TABLE || "dresses";
  }

  async listSeamstresses(search = "") {
    const s = String(search || "").trim();
    const params = [];
    let whereSql = "";

    if (s) {
      const like = `%${s}%`;
      whereSql = `
        WHERE
          s.name LIKE ? OR
          s.phone LIKE ?
      `;
      params.push(like, like);
    }

    const [rows] = await this.db.query(
      `
      SELECT
        s.seamstress_id,
        s.name,
        s.phone,
        COUNT(os.assignment_id) AS assignment_count
      FROM \`${this.seamstressesTable}\` s
      LEFT JOIN \`${this.assignmentsTable}\` os
        ON os.seamstress_id = s.seamstress_id
      ${whereSql}
      GROUP BY
        s.seamstress_id,
        s.name,
        s.phone
      ORDER BY s.seamstress_id DESC
      `,
      params
    );

    return rows;
  }

  async getSeamstressById(id) {
    const [rows] = await this.db.query(
      `
      SELECT
        s.seamstress_id,
        s.name,
        s.phone,
        COUNT(os.assignment_id) AS assignment_count
      FROM \`${this.seamstressesTable}\` s
      LEFT JOIN \`${this.assignmentsTable}\` os
        ON os.seamstress_id = s.seamstress_id
      WHERE s.seamstress_id = ?
      GROUP BY
        s.seamstress_id,
        s.name,
        s.phone
      `,
      [id]
    );

    return rows[0] || null;
  }

  async createSeamstress(data) {
    const [result] = await this.db.query(
      `
      INSERT INTO \`${this.seamstressesTable}\`
      (name, phone)
      VALUES (?, ?)
      `,
      [
        data.name,
        data.phone || null,
      ]
    );

    return this.getSeamstressById(result.insertId);
  }

  async updateSeamstress(id, data) {
    const [result] = await this.db.query(
      `
      UPDATE \`${this.seamstressesTable}\`
      SET
        name = ?,
        phone = ?
      WHERE seamstress_id = ?
      `,
      [
        data.name,
        data.phone || null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return null;
    }

    return this.getSeamstressById(id);
  }

  async deleteSeamstress(id) {
    const [result] = await this.db.query(
      `DELETE FROM \`${this.seamstressesTable}\` WHERE seamstress_id = ?`,
      [id]
    );

    return result.affectedRows > 0;
  }

  async listAssignments({ order_id = null } = {}) {
    const params = [];
    let whereSql = "";

    const hasOrderFilter =
      order_id !== null &&
      order_id !== undefined &&
      String(order_id).trim() !== "";

    if (hasOrderFilter) {
      whereSql = `WHERE os.order_id = ?`;
      params.push(Number(order_id));
    }

    const [rows] = await this.db.query(
      `
      SELECT
        os.assignment_id,
        os.order_id,
        os.seamstress_id,
        os.task_type,
        os.notes AS assignment_notes,
        s.name,
        s.phone,
        c.first_name,
        c.last_name,
        d.dress_name,
        o.occasion_type
      FROM \`${this.assignmentsTable}\` os
      JOIN \`${this.seamstressesTable}\` s ON s.seamstress_id = os.seamstress_id
      JOIN \`${this.ordersTable}\` o ON o.order_id = os.order_id
      JOIN \`${this.customersTable}\` c ON c.customer_id = o.customer_id
      LEFT JOIN \`${this.dressesTable}\` d ON d.dress_id = o.dress_id
      ${whereSql}
      ORDER BY os.assignment_id DESC
      `,
      params
    );

    return rows;
  }

  async getAssignmentById(id) {
    const [rows] = await this.db.query(
      `
      SELECT
        assignment_id,
        order_id,
        seamstress_id,
        task_type,
        notes
      FROM \`${this.assignmentsTable}\`
      WHERE assignment_id = ?
      `,
      [id]
    );

    return rows[0] || null;
  }

  async createAssignment(data) {
    const [result] = await this.db.query(
      `
      INSERT INTO \`${this.assignmentsTable}\`
      (order_id, seamstress_id, task_type, notes)
      VALUES (?, ?, ?, ?)
      `,
      [
        data.order_id,
        data.seamstress_id,
        data.task_type,
        data.notes || null,
      ]
    );

    return this.getAssignmentById(result.insertId);
  }

  async updateAssignment(id, data) {
    const [result] = await this.db.query(
      `
      UPDATE \`${this.assignmentsTable}\`
      SET
        order_id = ?,
        seamstress_id = ?,
        task_type = ?,
        notes = ?
      WHERE assignment_id = ?
      `,
      [
        data.order_id,
        data.seamstress_id,
        data.task_type,
        data.notes || null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return null;
    }

    return this.getAssignmentById(id);
  }

  async deleteAssignment(id) {
    const [result] = await this.db.query(
      `DELETE FROM \`${this.assignmentsTable}\` WHERE assignment_id = ?`,
      [id]
    );

    return result.affectedRows > 0;
  }
}

module.exports = SeamstressesModel;