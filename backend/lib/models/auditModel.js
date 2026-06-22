const db = require('../db');
const { randomUUID } = require('crypto');

// Append-only audit trail for accountability on privileged / destructive
// actions (deletes, plan changes, auth events). Never updated or deleted.

const insertStmt = db.prepare(`
  INSERT INTO audit_log (id, actorId, action, resource, resourceId, meta, ip, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

/**
 * Record an audit event. Best-effort: never throws into the caller's path.
 * @param {{ actorId?: string, action: string, resource?: string,
 *           resourceId?: string, meta?: object, ip?: string }} event
 */
async function recordAudit({ actorId = null, action, resource = null, resourceId = null, meta = null, ip = null } = {}) {
  try {
    await insertStmt.run(
      randomUUID(),
      actorId,
      action,
      resource,
      resourceId,
      meta ? JSON.stringify(meta) : null,
      ip,
      new Date().toISOString()
    );
  } catch {
    /* auditing must never break the request */
  }
}

module.exports = { recordAudit };
