/**
 * ============================================
 * SQLite DB Utility
 * Provides Mongoose-like API over better-sqlite3
 * ============================================
 */

const { getDb } = require('../config/database');

function generateId () {
  const { randomUUID } = require('crypto');
  return randomUUID();
}

function parseJson (val) {
  if (!val) return val;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return val; }
}

function stringifyJson (val) {
  if (!val) return val;
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}

function toBool (val) {
  return val ? 1 : 0;
}

function fromBool (val) {
  return val === 1 || val === true;
}

function mapUserRow (row) {
  if (!row) return null;
  return {
    ...row,
    isActive: fromBool(row.isActive),
    isSuspended: fromBool(row.isSuspended),
    isVerified: fromBool(row.isVerified),
    isPending: fromBool(row.isPending),
    isOnline: fromBool(row.isOnline),
    phoneVerified: fromBool(row.phoneVerified),
  };
}

function mapProductRow (row) {
  if (!row) return null;
  return {
  ...row,
  images: parseJson(row.images) || [],
  deliveryModes: parseJson(row.deliveryModes) || [],
  paymentModes: parseJson(row.paymentModes) || [],
  variants: parseJson(row.variants) || [],
  };
}

function mapOrderRow (row) {
  if (!row) return null;
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
  if (!row) return null;
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
  if (!row) return null;
  return {
    ...row,
    read: fromBool(row.read),
  };
}

function mapMessageRow (row) {
  if (!row) return null;
  return {
    ...row,
    isRead: fromBool(row.isRead),
  };
}

function mapDeliveryRow (row) {
  if (!row) return null;
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
    this.db = getDb();
  }

  _mapRow (row) {
    if (!row) return null;
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

  findById (id) {
    const row = this.db.prepare(`SELECT * FROM ${this.table} WHERE id = ?`).get(id);
    return this._mapRow(row);
  }

  findOne (where) {
    const { sql, params } = this._buildWhere(where);
    const row = this.db.prepare(`SELECT * FROM ${this.table} ${sql} LIMIT 1`).get(...params);
    return this._mapRow(row);
  }

  find (where = {}, opts = {}) {
    const { sql, params } = this._buildWhere(where);
    let query = `SELECT * FROM ${this.table} ${sql}`;

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

    const rows = this.db.prepare(query).all(...params);
    return this._mapRows(rows);
  }

  countDocuments (where = {}) {
    const { sql, params } = this._buildWhere(where);
    const row = this.db.prepare(`SELECT COUNT(*) as count FROM ${this.table} ${sql}`).get(...params);
    return row.count;
  }

  create (data) {
    if (!data.id) {
      data.id = generateId();
    }

    const cols = [];
    const vals = [];
    const placeholders = [];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      cols.push(key);
      vals.push(this._serializeValue(key, value));
      placeholders.push('?');
    }

    this.db.prepare(
      `INSERT INTO ${this.table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`
    ).run(...vals);

    return this.findById(data.id);
  }

  updateById (id, data) {
    const sets = [];
    const vals = [];

    for (const [key, value] of Object.entries(data)) {
      if (key === 'id' || key === '_id') continue;
      if (value === undefined) continue;
      sets.push(`${key} = ?`);
      vals.push(this._serializeValue(key, value));
    }

    if (sets.length === 0) return this.findById(id);

    sets.push("updatedAt = datetime('now')");
    vals.push(id);

    this.db.prepare(
      `UPDATE ${this.table} SET ${sets.join(', ')} WHERE id = ?`
    ).run(...vals);

    return this.findById(id);
  }

  deleteById (id) {
    const result = this.db.prepare(`DELETE FROM ${this.table} WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  deleteMany (where = {}) {
    const { sql, params } = this._buildWhere(where);
    if (!sql) {
      return this.db.prepare(`DELETE FROM ${this.table}`).run().changes;
    }
    return this.db.prepare(`DELETE FROM ${this.table} ${sql}`).run(...params).changes;
  }

  deleteOne (where) {
    const { sql, params } = this._buildWhere(where);
    const row = this.db.prepare(`SELECT id FROM ${this.table} ${sql} LIMIT 1`).get(...params);
    if (!row) return 0;
    return this.deleteById(row.id) ? 1 : 0;
  }

  updateMany (where, data) {
    const { sql, params: whereParams } = this._buildWhere(where);
    const sets = [];
    const vals = [];

    for (const [key, value] of Object.entries(data)) {
      if (key === 'id' || key === '_id') continue;
      if (value === undefined) continue;
      sets.push(`${key} = ?`);
      vals.push(this._serializeValue(key, value));
    }

    if (sets.length === 0) return 0;
    sets.push("updatedAt = datetime('now')");

    const query = `UPDATE ${this.table} SET ${sets.join(', ')} ${sql}`;
    return this.db.prepare(query).run(...vals, ...whereParams).changes;
  }

  findOneAndUpdate (where, data, _opts = {}) {
    const { sql, params } = this._buildWhere(where);
    const row = this.db.prepare(`SELECT id FROM ${this.table} ${sql} LIMIT 1`).get(...params);
    if (!row) return null;
    return this.updateById(row.id, data);
  }

  findByIdAndUpdate (id, data, _opts = {}) {
    return this.updateById(id, data);
  }

  aggregate (pipeline) {
    return this._runAggregate(pipeline);
  }

  _serializeValue (key, value) {
    if (value === null) return null;
    if (typeof value === 'boolean') return toBool(value);
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
          conditions.push(`${key} >= ?`);
          params.push(value.$gte);
        }
        if (value.$lte !== undefined) {
          conditions.push(`${key} <= ?`);
          params.push(value.$lte);
        }
        if (value.$gt !== undefined) {
          conditions.push(`${key} > ?`);
          params.push(value.$gt);
        }
        if (value.$ne !== undefined) {
          conditions.push(`${key} != ?`);
          params.push(value.$ne);
        }
        if (value.$in !== undefined) {
          const placeholders = value.$in.map(() => '?').join(',');
          conditions.push(`${key} IN (${placeholders})`);
          params.push(...value.$in);
        }
        if (value.$regex !== undefined) {
          const regexStr = value.$regex;
          conditions.push(`${key} LIKE ?`);
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
          conditions.push(`${key} IN (${placeholders})`);
          params.push(...value);
        }
        continue;
      }

      conditions.push(`${key} = ?`);
      params.push(value);
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
    };

    const allowedFields = allowedSortFields[this.table] || [];

    return Object.entries(sort).map(([field, dir]) => {
      if (!allowedFields.includes(field)) {
        console.warn(`Invalid sort field rejected: ${field} on table ${this.table}`);
        return '';
      }
      return `${field} ${dir === 1 ? 'ASC' : 'DESC'}`;
    }).filter(Boolean).join(', ');
  }

  _runAggregate (pipeline) {
    if (this.table === 'orders') {
      for (const stage of pipeline) {
        if (stage.$match && stage.$group) {
          const { sql, params } = this._buildWhere(stage.$match);
          const groupBy = stage.$group._id;
          const sums = Object.entries(stage.$group).filter(([k]) => k !== '_id');

          if (groupBy === null) {
            const selectParts = sums.map(([alias, expr]) => {
              if (expr.$sum) {
                return `SUM(${expr.$sum.replace('$', '').replace('pricing.', 'pricing_')}) as ${alias}`;
              }
              return `COUNT(*) as ${alias}`;
            });
            return this.db.prepare(`SELECT ${selectParts.join(', ')} FROM ${this.table} ${sql}`).all(...params);
          }

          const selectParts = [`${groupBy} as _id`, ...sums.map(([alias, expr]) => {
            if (expr.$sum) {
              if (typeof expr.$sum === 'number') return `SUM(${expr.$sum}) as ${alias}`;
              return `SUM(${expr.$sum.replace('$', '').replace('pricing.', 'pricing_')}) as ${alias}`;
            }
            return `COUNT(*) as ${alias}`;
          })];

          const sortPart = pipeline.find(s => s.$sort);
          let orderSql = '';
          if (sortPart) {
            orderSql = ' ORDER BY ' + this._buildOrder(sortPart.$sort);
          }

          return this.db.prepare(`SELECT ${selectParts.join(', ')} FROM ${this.table} ${sql} GROUP BY ${groupBy}${orderSql}`).all(...params);
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
            groupExpr = groupBy.replace('$', '').replace('pricing.', 'pricing_');
          } else if (groupBy && typeof groupBy === 'object' && groupBy.$dateToString) {
            const format = groupBy.$dateToString.format;
            const dateField = groupBy.$dateToString.date.replace('$', '');
            groupExpr = `strftime('${format.replace('%Y', '%Y').replace('%m', '%m').replace('%d', '%d').replace('%U', '%W')}', ${dateField})`;
          } else {
            groupExpr = groupBy;
          }

          const selectParts = [`${groupExpr} as _id`, ...sums.map(([alias, expr]) => {
            if (expr.$sum && typeof expr.$sum === 'number') return `SUM(${expr.$sum}) as ${alias}`;
            if (expr.$sum) return `SUM(${expr.$sum.replace('$', '').replace('pricing.', 'pricing_')}) as ${alias}`;
            if (expr.$count) return `COUNT(*) as ${alias}`;
            return `COUNT(*) as ${alias}`;
          })];

          const sortStage = pipeline.find(s => s.$sort);
          let orderSql = '';
          if (sortStage) {
            orderSql = ' ORDER BY ' + this._buildOrder(sortStage.$sort);
          }

          return this.db.prepare(`SELECT ${selectParts.join(', ')} FROM ${this.table} ${whereSql} GROUP BY ${groupExpr}${orderSql}`).all(...whereParams);
        }
      }
    }

    if (this.table === 'products') {
      for (const stage of pipeline) {
        if (stage.$match && stage.$group) {
          const { sql, params } = this._buildWhere(stage.$match);
          const groupBy = stage.$group._id.replace('$', '');
          const sums = Object.entries(stage.$group).filter(([k]) => k !== '_id');

          const selectParts = [`${groupBy} as _id`, ...sums.map(([alias, expr]) => {
            if (expr.$sum) return `SUM(${expr.$sum.replace('$', '').replace('pricing.', 'pricing_')}) as ${alias}`;
            return `COUNT(*) as ${alias}`;
          })];

          return this.db.prepare(`SELECT ${selectParts.join(', ')} FROM ${this.table} ${sql} GROUP BY ${groupBy}`).all(...params);
        }
      }
    }

    return [];
  }
}

function db (table) {
  return new Db(table);
}

module.exports = { db, Db, generateId, parseJson, stringifyJson, toBool, fromBool, mapUserRow, mapProductRow, mapOrderRow, mapReviewRow, mapNotificationRow, mapMessageRow, mapDeliveryRow };
