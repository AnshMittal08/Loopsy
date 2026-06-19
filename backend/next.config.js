/** @type {import('next').NextConfig} */

// In production we require an explicit first-party origin; we never fall back
// to a wildcard (a wildcard cannot be combined with credentialed requests and
// is poor hygiene). Locally we default to the Vite dev origin.
const FRONTEND_ORIGIN =
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV !== "production" ? "http://localhost:5173" : "");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const corsHeaders = [
  { key: "Access-Control-Allow-Methods", value: "GET, POST, PATCH, PUT, DELETE, OPTIONS" },
  { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
];

// Only emit the credentialed CORS pair when we have a concrete origin to trust.
if (FRONTEND_ORIGIN) {
  corsHeaders.unshift(
    { key: "Access-Control-Allow-Origin", value: FRONTEND_ORIGIN },
    { key: "Access-Control-Allow-Credentials", value: "true" },
    { key: "Vary", value: "Origin" }
  );
}

const nextConfig = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [...securityHeaders, ...corsHeaders],
      },
    ];
  },
};

module.exports = nextConfig;
