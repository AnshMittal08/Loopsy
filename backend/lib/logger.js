// Minimal structured logger. JSON lines in production (greppable, ingestible by
// any log platform), readable text in development. Replaces scattered
// console.warn/error so failures are searchable instead of lost.
//
// Usage:
//   logger.warn('ai.compiler_failed', { err: e.message, prompt });
//   const log = logger.child({ requestId });   // bind context to every line
//   logger.captureError('route.failed', err, { route });  // error + stack seam

const crypto = require('crypto');

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[process.env.LOG_LEVEL] || LEVELS.info;
const isProd = process.env.NODE_ENV === 'production';

function emit(level, event, fields = {}) {
  if (LEVELS[level] < threshold) return;
  const record = { level, event, time: new Date().toISOString(), ...fields };
  const line = isProd
    ? JSON.stringify(record)
    : `${level.toUpperCase()} ${event} ${Object.keys(fields).length ? JSON.stringify(fields) : ''}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

// `base` is merged into every line — used by child() to bind a requestId etc.
function makeLogger(base = {}) {
  const at = (level) => (event, fields = {}) => emit(level, event, { ...base, ...fields });
  return {
    debug: at('debug'),
    info: at('info'),
    warn: at('warn'),
    error: at('error'),
    child: (bindings = {}) => makeLogger({ ...base, ...bindings }),
    // Single seam for error reporting. Logs structured error+stack today;
    // swap the body for Sentry/OTel capture later without touching call sites.
    captureError: (event, error, fields = {}) =>
      emit('error', event, { ...base, ...fields, err: error?.message, stack: error?.stack }),
  };
}

// Short correlation id for a request/operation.
function newRequestId() {
  return crypto.randomUUID();
}

const logger = makeLogger();
logger.newRequestId = newRequestId;

module.exports = logger;
