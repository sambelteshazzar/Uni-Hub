/**
 * Support schema tests (spec 2026-09-24).
 * Verifies the support tables + indexes exist, the category/status CHECK
 * constraints hold, FKs cascade, and activity_logs accepts the two new
 * audit enum values.
 *
 * setup.js clears every table in afterEach, so each test seeds its own
 * user + rows — no cross-test data assumptions.
 */
const { getDb } = require('../config/database');

describe('Support ticket schema', () => {
  let sql;

  beforeAll(() => {
    sql = getDb();
  });

  const insertUser = (id, email) =>
    sql
      .prepare(
        'INSERT INTO users (id, fullName, email, phone, university, password) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(id, 'Schema User', email, '+233000000001', 'atu', 'x');

  test('support tables and indexes exist', () => {
    const tables = sql
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map(r => r.name);
    expect(tables).toEqual(expect.arrayContaining(['support_tickets', 'support_replies']));

    const indexes = sql
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
      .all()
      .map(r => r.name);
    expect(indexes).toEqual(
      expect.arrayContaining([
        'idx_support_tickets_user',
        'idx_support_tickets_status',
        'idx_support_replies_ticket',
      ])
    );
  });

  test('category CHECK rejects unknown categories', () => {
    insertUser('schema-user-1', 'schema_user_1@example.com');
    const insert = sql.prepare(
      'INSERT INTO support_tickets (id, userId, category, subject) VALUES (?, ?, ?, ?)'
    );
    expect(() => insert.run('schema-t-bad', 'schema-user-1', 'not-a-category', 'Hi')).toThrow(
      /CHECK constraint failed/i
    );
    expect(() =>
      insert.run('schema-t-ok', 'schema-user-1', 'payment', 'Payment failed')
    ).not.toThrow();
  });

  test('status CHECK rejects unknown statuses', () => {
    insertUser('schema-user-2', 'schema_user_2@example.com');
    sql
      .prepare(
        "INSERT INTO support_tickets (id, userId, category, subject) VALUES ('schema-t-2', 'schema-user-2', 'payment', 'Status check')"
      )
      .run();
    expect(() =>
      sql.prepare("UPDATE support_tickets SET status = 'nope' WHERE id = 'schema-t-2'").run()
    ).toThrow(/CHECK constraint failed/i);
    expect(() =>
      sql.prepare("UPDATE support_tickets SET status = 'resolved' WHERE id = 'schema-t-2'").run()
    ).not.toThrow();
  });

  test('support_replies cascade-deletes with the ticket', () => {
    insertUser('schema-user-3', 'schema_user_3@example.com');
    sql
      .prepare(
        "INSERT INTO support_tickets (id, userId, category, subject) VALUES ('ct-1', 'schema-user-3', 'other', 'Cascade')"
      )
      .run();
    sql
      .prepare(
        "INSERT INTO support_replies (id, ticketId, authorId, authorRole, body) VALUES ('cr-1', 'ct-1', 'schema-user-3', 'user', 'hello')"
      )
      .run();
    sql.prepare("DELETE FROM support_tickets WHERE id = 'ct-1'").run();
    const rows = sql.prepare("SELECT * FROM support_replies WHERE ticketId = 'ct-1'").all();
    expect(rows).toHaveLength(0);
  });

  test('support_tickets cascade-deletes when the author is deleted', () => {
    insertUser('schema-user-4', 'schema_user_4@example.com');
    sql
      .prepare(
        "INSERT INTO support_tickets (id, userId, category, subject) VALUES ('ct-2', 'schema-user-4', 'other', 'User gone')"
      )
      .run();
    sql.prepare("DELETE FROM users WHERE id = 'schema-user-4'").run();
    const rows = sql.prepare("SELECT * FROM support_tickets WHERE id = 'ct-2'").all();
    expect(rows).toHaveLength(0);
  });

  test('activity_logs accepts the new audit actions and rejects unknown ones', () => {
    const insertLog = sql.prepare(
      "INSERT INTO activity_logs (id, user, action, severity) VALUES (?, NULL, ?, 'info')"
    );
    expect(() => insertLog.run('log-ok-1', 'support_reply')).not.toThrow();
    expect(() => insertLog.run('log-ok-2', 'support_status_change')).not.toThrow();
    expect(() => insertLog.run('log-bad', 'not_a_support_action')).toThrow(
      /CHECK constraint failed/i
    );
  });
});
