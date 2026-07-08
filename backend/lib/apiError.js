// Thin wrapper that records an unhandled route error to the first-party
// error_log before returning a 500 — so production failures are visible on
// /admin instead of only in ephemeral logs. Opt-in per route; never changes
// a route's success behaviour.

const { NextResponse } = require('next/server');
const { recordError } = require('./models/errorModel');
const logger = require('./logger');

/**
 * @param {string} route stable route id, e.g. "POST /api/ai/generate-pattern"
 * @param {(request: Request, ctx: any) => Promise<Response>} handler
 */
function withErrorCapture(route, handler) {
  const [method, path] = route.includes(' ') ? route.split(' ') : [null, route];
  return async (request, ctx) => {
    try {
      return await handler(request, ctx);
    } catch (error) {
      logger.error('route.error', { route, error: error.message });
      // Best-effort telemetry; failure here must not mask the original error.
      recordError({
        route: path,
        method: method || request?.method || null,
        message: error.message,
        stack: error.stack,
        statusCode: 500,
      }).catch(() => {});
      return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }
  };
}

module.exports = { withErrorCapture };
