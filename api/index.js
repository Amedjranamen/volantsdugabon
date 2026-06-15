// Serverless wrapper for Vercel: export the Express app from admin-server
try {
  const app = require('../admin-server');
  module.exports = app;
} catch (e) {
  // If loading fails, export a minimal handler that returns 500 with error message
  module.exports = (req, res) => {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to load admin-server', details: String(e && e.message) }));
  };
}
