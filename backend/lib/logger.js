// Minimal structured logger. JSON lines in production (greppable, ingestible by
// any log platform), readable text in development. Replaces scattered
// console.warn/error so failures are searchable instead of lost.
//
// Usage: logger.warn('ai.compiler_failed', { err: e.message, prompt });

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[process.env.LOG_LEVEL] || LEVELS.info;
const isProd = process.env.NODE_ENV === 'production';

function emit(level, event, fields = {}) {
  if (LEVELS[level] < threshold) return;
  const record = { level, event, time: new Date().toISOString(), ...fields };
  const line = isProd ? JSON.stringify(record) : `${level.toUpperCase()} ${event} ${Object.keys(fields).length ? JSON.stringify(fields) : ''}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

module.exports = {
  debug: (event, fields) => emit('debug', event, fields),
  info: (event, fields) => emit('info', event, fields),
  warn: (event, fields) => emit('warn', event, fields),
  error: (event, fields) => emit('error', event, fields),
};
