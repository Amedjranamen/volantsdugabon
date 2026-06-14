const path = require('path');
const app = require(path.join(__dirname, '..', 'admin-server', 'index.js'));

module.exports = (req, res) => {
  // Forward request to the Express app
  return app(req, res);
};
