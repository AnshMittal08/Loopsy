import logger from "../logger.js";

// Provider-agnostic transactional email. Works out of the box without any
// provider (it logs the message + link so dev/staging flows are testable),
// and sends via Resend's HTTP API when RESEND_API_KEY is set — no SDK needed.
// Swap in SES/Postmark by adding another branch here; call sites never change.

const FROM = process.env.EMAIL_FROM || "Loopsy <noreply@loopsy.app>";

function stripHtml(html = "") {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Send an email. Never throws into the caller — delivery failures are logged
 * and reported via the return value so they can't break an auth flow.
 * @returns {Promise<{ delivered: boolean, logged?: boolean, error?: string }>}
 */
export async function sendEmail({ to, subject, html, text }) {
  const body = text || stripHtml(html);
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    // No provider configured: log so the link is recoverable in dev/staging.
    logger.info("email.logged", { to, subject, body });
    return { delivered: false, logged: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject, html, text: body }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      logger.error("email.send_failed", { to, subject, status: res.status, detail });
      return { delivered: false, error: `provider ${res.status}` };
    }
    logger.info("email.sent", { to, subject });
    return { delivered: true };
  } catch (error) {
    logger.captureError("email.send_error", error, { to, subject });
    return { delivered: false, error: error.message };
  }
}
