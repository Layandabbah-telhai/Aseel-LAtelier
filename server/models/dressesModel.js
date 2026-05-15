class DressesModel {
  constructor(dbPool) {
    this.db = dbPool;
    this.table = process.env.DRESSES_TABLE || "dresses";
    this.imagesTable = process.env.DRESS_IMAGES_TABLE || "dress_images";
  }

  isMissingImagesTableError(err) {
    return (
      err &&
      (
        err.code === "ER_NO_SUCH_TABLE" ||
        err.code === "ER_BAD_TABLE_ERROR" ||
        err.code === "ER_BAD_FIELD_ERROR"
      )
    );
  }

  async attachImagesToDress(dress) {
    if (!dress) return null;

    try {
      const [images] = await this.db.query(
        `SELECT image_id, dress_id, image_url, sort_order
         FROM \`${this.imagesTable}\`
         WHERE dress_id = ?
         ORDER BY sort_order ASC, image_id ASC`,
        [dress.dress_id]
      );

      dress.images = images;
      dress.image_url = images[0]?.image_url || dress.image_url || null;
    } catch (err) {
      if (!this.isMissingImagesTableError(err)) {
        throw err;
      }

      dress.images = dress.image_url ? [{ image_url: dress.image_url }] : [];
    }

    return dress;
  }

  async attachImagesToDresses(dresses) {
    if (!Array.isArray(dresses) || dresses.length === 0) return dresses;

    try {
      const ids = dresses.map((d) => d.dress_id);
      const placeholders = ids.map(() => "?").join(",");

      const [images] = await this.db.query(
        `SELECT image_id, dress_id, image_url, sort_order
         FROM \`${this.imagesTable}\`
         WHERE dress_id IN (${placeholders})
         ORDER BY sort_order ASC, image_id ASC`,
        ids
      );

      const grouped = new Map();

      for (const img of images) {
        if (!grouped.has(img.dress_id)) {
          grouped.set(img.dress_id, []);
        }

        grouped.get(img.dress_id).push(img);
      }

      for (const dress of dresses) {
        const dressImages = grouped.get(dress.dress_id) || [];
        dress.images = dressImages;
        dress.image_url = dressImages[0]?.image_url || dress.image_url || null;
      }
    } catch (err) {
      if (!this.isMissingImagesTableError(err)) {
        throw err;
      }

      for (const dress of dresses) {
        dress.images = dress.image_url ? [{ image_url: dress.image_url }] : [];
      }
    }

    return dresses;
  }

  async list({ search = "" } = {}) {
    const s = String(search || "").trim();

    let rows;

    if (!s) {
      [rows] = await this.db.query(
        `SELECT dress_id, dress_name, size, color, status, rental_price, sale_price, notes, image_url
         FROM \`${this.table}\`
         ORDER BY dress_id DESC
         LIMIT 500`
      );
    } else {
      const like = `%${s}%`;

      [rows] = await this.db.query(
        `SELECT dress_id, dress_name, size, color, status, rental_price, sale_price, notes, image_url
         FROM \`${this.table}\`
         WHERE dress_name LIKE ?
            OR size LIKE ?
            OR color LIKE ?
            OR status LIKE ?
            OR notes LIKE ?
         ORDER BY dress_id DESC
         LIMIT 500`,
        [like, like, like, like, like]
      );
    }

    return this.attachImagesToDresses(rows);
  }

  async getById(dress_id) {
    const [rows] = await this.db.query(
      `SELECT dress_id, dress_name, size, color, status, rental_price, sale_price, notes, image_url
       FROM \`${this.table}\`
       WHERE dress_id = ?`,
      [dress_id]
    );

    return this.attachImagesToDress(rows[0] || null);
  }

  async create({
    dress_name,
    size,
    color,
    status,
    rental_price,
    sale_price,
    notes,
    image_url,
    image_urls = [],
  }) {
    const firstImage = image_urls[0] || image_url || null;

    const [result] = await this.db.query(
      `INSERT INTO \`${this.table}\`
       (dress_name, size, color, status, rental_price, sale_price, notes, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dress_name,
        size || null,
        color || null,
        status || "Available",
        rental_price ?? null,
        sale_price ?? null,
        notes || null,
        firstImage,
      ]
    );

    const dressId = result.insertId;

    try {
      const imagesToSave = image_urls.length ? image_urls : firstImage ? [firstImage] : [];

      if (imagesToSave.length) {
        const values = imagesToSave.map((url, index) => [dressId, url, index]);

        await this.db.query(
          `INSERT INTO \`${this.imagesTable}\`
           (dress_id, image_url, sort_order)
           VALUES ?`,
          [values]
        );
      }
    } catch (err) {
      if (!this.isMissingImagesTableError(err)) {
        throw err;
      }
    }

    return this.getById(dressId);
  }

  async update(
    dress_id,
    {
      dress_name,
      size,
      color,
      status,
      rental_price,
      sale_price,
      notes,
      image_url,
      image_urls = [],
    }
  ) {
    const firstImage = image_urls.length ? image_urls[0] : image_url || null;

    const [result] = await this.db.query(
      `UPDATE \`${this.table}\`
       SET dress_name = ?,
           size = ?,
           color = ?,
           status = ?,
           rental_price = ?,
           sale_price = ?,
           notes = ?,
           image_url = ?
       WHERE dress_id = ?`,
      [
        dress_name,
        size || null,
        color || null,
        status || "Available",
        rental_price ?? null,
        sale_price ?? null,
        notes || null,
        firstImage,
        dress_id,
      ]
    );

    if (result.affectedRows === 0) {
      return null;
    }

    try {
      if (image_urls.length) {
        await this.db.query(
          `DELETE FROM \`${this.imagesTable}\` WHERE dress_id = ?`,
          [dress_id]
        );

        const values = image_urls.map((url, index) => [dress_id, url, index]);

        await this.db.query(
          `INSERT INTO \`${this.imagesTable}\`
           (dress_id, image_url, sort_order)
           VALUES ?`,
          [values]
        );
      }
    } catch (err) {
      if (!this.isMissingImagesTableError(err)) {
        throw err;
      }
    }

    return this.getById(dress_id);
  }

  async remove(dress_id) {
    try {
      await this.db.query(
        `DELETE FROM \`${this.imagesTable}\` WHERE dress_id = ?`,
        [dress_id]
      );
    } catch (err) {
      if (!this.isMissingImagesTableError(err)) {
        throw err;
      }
    }

    const [result] = await this.db.query(
      `DELETE FROM \`${this.table}\` WHERE dress_id = ?`,
      [dress_id]
    );

    return result.affectedRows > 0;
  }
}

module.exports = DressesModel;