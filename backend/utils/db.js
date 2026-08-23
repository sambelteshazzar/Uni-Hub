/**
 * ============================================
 * DB Utility — Mongoose-like API
 * Supports both Turso (async @libsql/client)
 * and local SQLite (better-sqlite3 sync)
 * All methods return Promises for uniform usage
 * ============================================
 */

const { getDb, getTursoClient, isTurso } = require('../config/database');

function generateId () {
  const { randomUUID } = require('crypto');
  return randomUUID();
}

function parseJson (val) {
  if (!val) {return val;}
  if (typeof val === 'object') {return val;}
  try { return JSON.parse(val); } catch { return val; }
}

function stringifyJson (val) {
  if (!val) {return val;}
  if (typeof val === 'string') {return val;}
  return JSON.stringify(val);
}

function toBool (val) {
  return val ? 1 : 0;
}

function fromBool (val) {
  return val === 1 || val === true;
}

function mapUserRow (row) {
  if (!row) {return null;}
  return {
    ...row,
    isActive: fromBool(row.isActive),
    isSuspended: fromBool(row.isSuspended),
    isVerified: fromBool(row.isVerified),
    isPending: fromBool(row.isPending),
    isOnline: fromBool(row.isOnline),
  };
}

function mapProductRow (row) {
  if (!row) {return null;}
  return {
    ...row,
    images: parseJson(row.images) || [],
    deliveryModes: parseJson(row.deliveryModes) || [],
    paymentModes: parseJson(row.paymentModes) || [],
    variants: parseJson(row.variants) || [],
  };
}

function mapOrderRow (row) {
  if (!row) {return null;}
  return {
    ...row,
    orderNumber: row.orderNumber,
    trackingNumber: row.trackingNumber,
    customer: {
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
      university: row.customer_university,
    },
    pricing: {
      subtotal: row.pricing_subtotal,
      deliveryFee: row.pricing_deliveryFee,
      grandTotal: row.pricing_grandTotal,
      currency: row.pricing_currency,
    },
    delivery: {
      mode: row.delivery_mode,
      address: row.delivery_address,
      instructions: row.delivery_instructions,
      status: row.delivery_status,
    },
    payment: {
      mode: row.payment_mode,
      status: row.payment_status,
      transactionId: row.payment_transactionId,
      paidAt: row.payment_paidAt,
    },
  };
}

function mapReviewRow (row) {
  if (!row) {return null;}
  return {
    ...row,
    detailedRatings: {
      accuracy: row.detailedRatings_accuracy,
      communication: row.detailedRatings_communication,
      value: row.detailedRatings_value,
    },
    helpfulVotes: parseJson(row.helpfulVotes) || [],
    sellerResponse: row.sellerResponse_comment ? {
      comment: row.sellerResponse_comment,
      respondedAt: row.sellerResponse_respondedAt,
    } : null,
  };
}

function mapNotificationRow (row) {
  if (!row) {return null;}
  return {
    ...row,
    read: fromBool(row.read),
  };
}

function mapMessageRow (row) {
  if (!row) {return null;}
  return {
    ...row,
    isRead: fromBool(row.isRead),
  };
}

function mapDeliveryRow (row) {
  if (!row) {return null;}
  return {
    ...row,
    location: row.location_latitude ? {
      latitude: row.location_latitude,
      longitude: row.location_longitude,
      lastUpdated: row.location_lastUpdated,
    } : null,
  };
}

const TABLE_MAP = {
  users: 'users',
  products: 'products',
  orders: 'orders',
  reviews: 'reviews',
  payments: 'payments',
  conversations: 'conversations',
  messages: 'messages',
  deliveries: 'deliveries',
  wishlists: 'wishlists',
  notifications: 'notifications',
  search_history: 'search_history',
  activity_logs: 'activity_logs',
  student_verifications: 'student_verifications',
};

const MAPPER_MAP = {
  users: mapUserRow,
  products: mapProductRow,
  orders: mapOrderRow,
  reviews: mapReviewRow,
  notifications: mapNotificationRow,
  messages: mapMessageRow,
  deliveries: mapDeliveryRow,
};

class Db {
  constructor (table) {
    this.table = table;
  }

  // Wrap an SQL identifier (table or column name) in double quotes so
  // reserved keywords like "order" / "group" / "select" don't break SQL
  // parsing. Doubles any embedded double-quotes per SQL standard.
  _q (ident) {
    return '"' + String(ident).replace(/"/g, '""') + '"';
  }
  _mapRow (row) {
    if (!row) {return null;}
    const mapper = MAPPER_MAP[this.table];
    const mapped = mapper ? mapper(row) : row;
    if (mapped && !mapped._id) {
      mapped._id = mapped.id;
    }
    return mapped;
  }

  _mapRows (rows) {
    return rows.map(r => this._mapRow(r));
  }

  _turso () {
    const client = getTursoClient();
    if (!client) {throw new Error('Turso client not initialized');}
    return client;
  }

  _local () {
    return getDb();
  }

  async _run (sql, params = []) {
    if (isTurso()) {
      const result = await this._turso().execute({ sql, args: params });
      return result;
    }
    const stmt = this._local().prepare(sql);
    if (sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA')) {
      if (sql.includes('LIMIT 1') || sql.trim().toUpperCase().startsWith('PRAGMA')) {
        return { rows: stmt.all(...params), changes: 0 };
      }
      return { rows: stmt.all(...params), changes: 0 };
    }
    const info = stmt.run(...params);
    return { rows: [], changes: info.changes, lastInsertRowid: info.lastInsertRowid };
  }

  async _get (sql, params = []) {
    if (isTurso()) {
      const result = await this._turso().execute({ sql, args: params });
      const row = result.rows[0] || null;
      return { row, rows: result.rows, changes: 0 };
    }
    const row = this._local().prepare(sql).get(...params);
    return { row, rows: row ? [row] : [], changes: 0 };
  }

  async _all (sql, params = []) {
    if (isTurso()) {
      const result = await this._turso().execute({ sql, args: params });
      return result.rows;
    }
    return this._local().prepare(sql).all(...params);
  }

  async _runWrite (sql, params = []) {
    if (isTurso()) {
      const result = await this._turso().execute({ sql, args: params });
      return { changes: result.rowsAffected || 0, lastInsertRowid: result.lastInsertRowid };
    }
    const info = this._local().prepare(sql).run(...params);
    return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
  }

  async findById (id) {
    const { row } = await this._get(`SELECT * FROM ${this._q(this.table)} WHERE ${this._q('id')} = ?`, [id]);
    return this._mapRow(row);
  }

  async findOne (where) {
    const { sql, params } = this._buildWhere(where);
    const { row } = await this._get(`SELECT * FROM ${this._q(this.table)} ${sql} LIMIT 1`, params);
    return this._mapRow(row);
  }

  async find (where = {}, opts = {}) {
    const { sql, params } = this._buildWhere(where);
    let query = `SELECT * FROM ${this._q(this.table)} ${sql}`;

    if (opts.sort) {
      query += ' ORDER BY ' + this._buildOrder(opts.sort);
    }

    if (opts.limit) {
      query += ' LIMIT ?';
      params.push(Number(opts.limit));
    }

    if (opts.skip) {
      if (!opts.limit) {
        query += ' LIMIT -1';
      }
      query += ' OFFSET ?';
      params.push(Number(opts.skip));
    }

    const rows = await this._all(query, params);
    return this._mapRows(rows);
  }

  async countDocuments (where = {}) {
    const { sql, params } = this._buildWhere(where);
    const { row } = await this._get(`SELECT COUNT(*) as count FROM ${this._q(this.table)} ${sql}`, params);
    return (row && row.count) || 0;
  }

  async create (data) {
    if (!data.id) {
      data.id = generateId();
    }

    const cols = [];
    const vals = [];
    const placeholders = [];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) {continue;}
      cols.push(this._q(key));
      vals.push(this._serializeValue(key, value));
      placeholders.push('?');
    }

    await this._runWrite(
      `INSERT INTO ${this._q(this.table)} (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`,
      vals,
    );

    return this.findById(data.id);
  }

  async updateById (id, data) {
    const sets = [];
    const vals = [];

    for (const [key, value] of Object.entries(data)) {
      if (key === 'id' || key === '_id') {continue;}
      if (value === undefined) {continue;}
      sets.push(`${this._q(key)} = ?`);
      vals.push(this._serializeValue(key, value));
    }

    if (sets.length === 0) {return this.findById(id);}

    sets.push(`${this._q('updatedAt')} = datetime('now')`);
    vals.push(id);

    await this._runWrite(
      `UPDATE ${this._q(this.table)} SET ${sets.join(', ')} WHERE ${this._q('id')} = ?`,
      vals,
    );

    return this.findById(id);
  }

  async deleteById (id) {
    const { changes } = await this._runWrite(`DELETE FROM ${this._q(this.table)} WHERE ${this._q('id')} = ?`, [id]);
    return changes > 0;
  }

  async deleteMany (where = {}) {
    const { sql, params } = this._buildWhere(where);
    if (!sql) {
      const { changes } = await this._runWrite(`DELETE FROM ${this._q(this.table)}`);
      return changes;
    }
    const { changes } = await this._runWrite(`DELETE FROM ${this._q(this.table)} ${sql}`, params);
    return changes;
  }

  async deleteOne (where) {
    const { sql, params } = this._buildWhere(where);
    const { row } = await this._get(`SELECT id FROM ${this._q(this.table)} ${sql} LIMIT 1`, params);
    if (!row) {return 0;}
    const deleted = await this.deleteById(row.id);
    return deleted ? 1 : 0;
  }

  async updateMany (where, data) {
    const { sql, params: whereParams } = this._buildWhere(where);
    const sets = [];
    const vals = [];

    for (const [key, value] of Object.entries(data)) {
      if (key === 'id' || key === '_id') {continue;}
      if (value === undefined) {continue;}
      sets.push(`${this._q(key)} = ?`);
      vals.push(this._serializeValue(key, value));
    }

    if (sets.length === 0) {return 0;}
    sets.push(`${this._q('updatedAt')} = datetime('now')`);

    const query = `UPDATE ${this._q(this.table)} SET ${sets.join(', ')} ${sql}`;
    const { changes } = await this._runWrite(query, [...vals, ...whereParams]);
    return changes;
  }

  async findOneAndUpdate (where, data, _opts = {}) {
    const { sql, params } = this._buildWhere(where);
    const { row } = await this._get(`SELECT id FROM ${this._q(this.table)} ${sql} LIMIT 1`, params);
    if (!row) {return null;}
    return this.updateById(row.id, data);
  }

  async findByIdAndUpdate (id, data, _opts = {}) {
    return this.updateById(id, data);
  }

  async aggregate (pipeline) {
    return this._runAggregate(pipeline);
  }

  async rawAll (sql, params = []) {
    return this._all(sql, Array.isArray(params) ? params : [params]);
  }

  async rawGet (sql, params = []) {
    const { row } = await this._get(sql, Array.isArray(params) ? params : [params]);
    return row;
  }

  async rawRun (sql, params = []) {
    return this._runWrite(sql, Array.isArray(params) ? params : [params]);
  }

  async transaction (fn) {
    if (isTurso()) {
      // NOTE: Turso's HTTP client does not preserve transaction state
      // across separate execute() calls (each call is its own HTTP
      // request and the server auto-commits). This wrapper therefore
      // does NOT provide true atomicity on Turso — it's a logical
      // boundary only. For true atomicity on Turso, use batchWrite()
      // with an array of statements, which submits them all via a
      // single client.batch() call. On local better-sqlite3, this
      // wrapper is still non-atomic (same as before) but the natural
      // fsync-per-statement is fast enough that mid-txn crashes are
      // extremely rare.
      const client = this._turso();
      try {
        await client.execute('BEGIN');
      } catch (_e) { /* server may reject BEGIN — fall through to non-atomic */ }
      try {
        const result = await fn(this);
        try { await client.execute('COMMIT'); } catch (_e) { /* ignore */ }
        return result;
      } catch (err) {
        try { await client.execute('ROLLBACK'); } catch (_e) { /* ignore */ }
        throw err;
      }
    }
    const result = await fn(this);
    return result;
  }

  // Atomic write on Turso via libSQL's batch() (single HTTP call, all
  // statements succeed or all fail). On local better-sqlite3, wraps
  // the statements in a real transaction. Each statement is
  // { sql: string, args?: any[] }.
  async batchWrite (statements) {
    if (!Array.isArray(statements) || statements.length === 0) {return [];}
    if (isTurso()) {
      const client = this._turso();
      const batch = statements.map(s => ({ sql: s.sql, args: s.args || [] }));
      return client.batch(batch, 'write');
    }
    const localDb = this._local();
    const tx = localDb.transaction(() => {
      const results = [];
      for (const s of statements) {
        const info = localDb.prepare(s.sql).run(...(s.args || []));
        results.push({ changes: info.changes, lastInsertRowid: info.lastInsertRowid });
      }
      return results;
    });
    return tx();
  }

  _serializeValue (key, value) {
    if (value === null) {return null;}
    if (typeof value === 'boolean') {return toBool(value);}
    if (Array.isArray(value) || (typeof value === 'object' && value !== null && !(value instanceof Date))) {
      return JSON.stringify(value);
    }
    return value;
  }

  _buildWhere (where) {
    const conditions = [];
    const params = [];

    for (const [key, value] of Object.entries(where)) {
      if (key === '$or') {
        const orParts = value.map(orCond => {
          const { sql, params: orParams } = this._buildWhere(orCond);
          return { sql: sql.replace(/^ WHERE /, ''), params: orParams };
        });
        conditions.push('(' + orParts.map(p => p.sql).join(' OR ') + ')');
        orParts.forEach(p => params.push(...p.params));
        continue;
      }

      if (key === '$text') {
        const searchTerm = value.$search;
        conditions.push('(title LIKE ? OR description LIKE ?)');
        params.push(`%${searchTerm}%`, `%${searchTerm}%`);
        continue;
      }

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (value.$gte !== undefined) {
          conditions.push(`${this._q(key)} >= ?`);
          params.push(value.$gte);
        }
        if (value.$lte !== undefined) {
          conditions.push(`${this._q(key)} <= ?`);
          params.push(value.$lte);
        }
        if (value.$gt !== undefined) {
          conditions.push(`${this._q(key)} > ?`);
          params.push(value.$gt);
        }
        if (value.$ne !== undefined) {
          conditions.push(`${this._q(key)} != ?`);
          params.push(value.$ne);
        }
        if (value.$in !== undefined) {
          const placeholders = value.$in.map(() => '?').join(',');
          conditions.push(`${this._q(key)} IN (${placeholders})`);
          params.push(...value.$in);
        }
        if (value.$regex !== undefined) {
          const regexStr = value.$regex;
          conditions.push(`${this._q(key)} LIKE ?`);
          let likePattern = regexStr;
          if (!likePattern.startsWith('^') && !likePattern.startsWith('%')) {
            likePattern = `%${likePattern}%`;
          } else {
            likePattern = likePattern.replace(/^\^/, '').replace(/\$$/, '%');
          }
          likePattern = likePattern.replace(/\.\*/g, '%').replace(/\.\?/g, '_').replace(/\./g, '_');
          params.push(likePattern);
        }
        continue;
      }

      if (Array.isArray(value)) {
        if (value.length === 0) {
          conditions.push('1 = 0');
        } else {
          const placeholders = value.map(() => '?').join(',');
          conditions.push(`${this._q(key)} IN (${placeholders})`);
          params.push(...value);
        }
        continue;
      }

      if (value === null || value === undefined) {
        conditions.push(`${this._q(key)} IS NULL`);
      } else {
        conditions.push(`${this._q(key)} = ?`);
        params.push(value);
      }
    }

    const sql = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
    return { sql, params };
  }

  _buildOrder (sort) {
    const allowedSortFields = {
      users: ['id', 'fullName', 'email', 'university', 'role', 'rating', 'totalReviews', 'createdAt', 'updatedAt', 'lastLogin', 'bannedAt'],
      products: ['id', 'title', 'price', 'category', 'condition', 'status', 'university', 'views', 'sellerRating', 'createdAt', 'updatedAt'],
      orders: ['id', 'userId', 'status', 'payment_status', 'delivery_status', 'pricing_grandTotal', 'createdAt', 'updatedAt'],
      reviews: ['id', 'rating', 'createdAt', 'updatedAt', 'reportCount'],
      payments: ['id', 'orderId', 'userId', 'amount', 'status', 'createdAt', 'updatedAt'],
      notifications: ['id', 'userId', 'type', 'createdAt'],
      messages: ['id', 'conversationId', 'createdAt'],
      deliveries: ['id', 'orderId', 'status', 'createdAt', 'updatedAt'],
      conversations: ['id', 'createdAt', 'updatedAt'],
      wishlists: ['id', 'userId', 'createdAt'],
      search_history: ['id', 'userId', 'createdAt'],
      activity_logs: ['id', 'action', 'severity', 'user', 'createdAt'],
      student_verifications: ['id', 'userId', 'status', 'createdAt', 'updatedAt'],
      order_items: ['id', 'orderId', 'productId', 'price', 'quantity'],
      payouts: ['id', 'sellerId', 'amount', 'status', 'requestedAt', 'processedAt'],
      ledger_entries: ['id', 'sellerId', 'orderId', 'type', 'status', 'createdAt'],
      admin_mfa_challenges: ['id', 'userId', 'createdAt', 'expiresAt'],
    };

    const allowedFields = allowedSortFields[this.table] || [];

    return Object.entries(sort).map(([field, dir]) => {
      if (!allowedFields.includes(field)) {
        console.warn(`Invalid sort field rejected: ${field} on table ${this.table}`);
        return '';
      }
      return `${this._q(field)} ${dir === 1 ? 'ASC' : 'DESC'}`;
    }).filter(Boolean).join(', ');
  }

  async _runAggregate (pipeline) {
    if (this.table === 'orders') {
      for (const stage of pipeline) {
        if (stage.$match && stage.$group) {
          const { sql, params } = this._buildWhere(stage.$match);
          const groupBy = stage.$group._id;
          const sums = Object.entries(stage.$group).filter(([k]) => k !== '_id');

          if (groupBy === null) {
            const selectParts = sums.map(([alias, expr]) => {
              if (expr.$sum) {
                return `SUM(${this._q(expr.$sum.replace('$', '').replace('pricing.', 'pricing_'))}) as ${this._q(alias)}`;
              }
              return `COUNT(*) as ${this._q(alias)}`;
            });
            return this._all(`SELECT ${selectParts.join(', ')} FROM ${this._q(this.table)} ${sql}`, params);
          }

          const selectParts = [`${this._q(groupBy)} as _id`, ...sums.map(([alias, expr]) => {
            if (expr.$sum) {
              if (typeof expr.$sum === 'number') {return `SUM(${expr.$sum}) as ${this._q(alias)}`;}
              return `SUM(${this._q(expr.$sum.replace('$', '').replace('pricing.', 'pricing_'))}) as ${this._q(alias)}`;
            }
            return `COUNT(*) as ${this._q(alias)}`;
          })];

          const sortPart = pipeline.find(s => s.$sort);
          let orderSql = '';
          if (sortPart) {
            orderSql = ' ORDER BY ' + this._buildOrder(sortPart.$sort);
          }

          return this._all(`SELECT ${selectParts.join(', ')} FROM ${this._q(this.table)} ${sql} GROUP BY ${this._q(groupBy)}${orderSql}`, params);
        }

        if (stage.$match && !stage.$group) {
          // Just a match stage, handled by next stage
        }

        if (stage.$group) {
          const groupBy = stage.$group._id;
          const sums = Object.entries(stage.$group).filter(([k]) => k !== '_id');
          const matchStage = pipeline.find(s => s.$match);
          let whereSql = '';
          let whereParams = [];
          if (matchStage) {
            const built = this._buildWhere(matchStage.$match);
            whereSql = built.sql;
            whereParams = built.params;
          }

          let groupExpr;
          if (typeof groupBy === 'string' && groupBy.startsWith('$')) {
            groupExpr = this._q(groupBy.replace('$', '').replace('pricing.', 'pricing_'));
          } else if (groupBy && typeof groupBy === 'object' && groupBy.$dateToString) {
            const format = groupBy.$dateToString.format;
            const dateField = groupBy.$dateToString.date.replace('$', '');
            groupExpr = `strftime('${format.replace('%Y', '%Y').replace('%m', '%m').replace('%d', '%d').replace('%U', '%W')}', ${this._q(dateField)})`;
          } else {
            groupExpr = groupBy;
          }

          const selectParts = [`${groupExpr} as _id`, ...sums.map(([alias, expr]) => {
            if (expr.$sum && typeof expr.$sum === 'number') {return `SUM(${expr.$sum}) as ${this._q(alias)}`;}
            if (expr.$sum) {return `SUM(${this._q(expr.$sum.replace('$', '').replace('pricing.', 'pricing_'))}) as ${this._q(alias)}`;}
            if (expr.$count) {return `COUNT(*) as ${this._q(alias)}`;}
            return `COUNT(*) as ${this._q(alias)}`;
          })];

          const sortStage = pipeline.find(s => s.$sort);
          let orderSql = '';
          if (sortStage) {
            orderSql = ' ORDER BY ' + this._buildOrder(sortStage.$sort);
          }

          return this._all(`SELECT ${selectParts.join(', ')} FROM ${this._q(this.table)} ${whereSql} GROUP BY ${groupExpr}${orderSql}`, whereParams);
        }
      }
    }

    if (this.table === 'products') {
      for (const stage of pipeline) {
        if (stage.$match && stage.$group) {
          const { sql, params } = this._buildWhere(stage.$match);
          const groupBy = stage.$group._id.replace('$', '');
          const sums = Object.entries(stage.$group).filter(([k]) => k !== '_id');

          const selectParts = [`${this._q(groupBy)} as _id`, ...sums.map(([alias, expr]) => {
            if (expr.$sum) {return `SUM(${this._q(expr.$sum.replace('$', '').replace('pricing.', 'pricing_'))}) as ${this._q(alias)}`;}
            return `COUNT(*) as ${this._q(alias)}`;
          })];

          return this._all(`SELECT ${selectParts.join(', ')} FROM ${this._q(this.table)} ${sql} GROUP BY ${this._q(groupBy)}`, params);
        }
      }
    }

    return [];
  }
}

function db (table) {
  return new Db(table);
}

async function runInTransaction (fn) {
  if (isTurso()) {
    const client = getTursoClient();
    if (!client) {throw new Error('Turso client not initialized');}
    await client.execute('BEGIN');
    try {
      const result = await fn(db);
      await client.execute('COMMIT');
      return result;
    } catch (err) {
      try { await client.execute('ROLLBACK'); } catch (_e) { /* ignore rollback error */ }
      throw err;
    }
  }
  const localDb = getDb();
  if (!localDb) {throw new Error('Local DB not initialized');}
  const tx = localDb.transaction(() => {
    throw new Error('Synchronous transaction cannot be used with async code');
  });
  const result = await fn(db);
  return result;
}

module.exports = { db, Db, generateId, parseJson, stringifyJson, toBool, fromBool, mapUserRow, mapProductRow, mapOrderRow, mapReviewRow, mapNotificationRow, mapMessageRow, mapDeliveryRow, runInTransaction };
