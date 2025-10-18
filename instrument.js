// instrument.js
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN, // DSN from your environment
  tracesSampleRate: 1.0,       // for performance monitoring
  sendDefaultPii: true,        // optional, sends user info
});

module.exports = Sentry;
