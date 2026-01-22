// Vercel serverless entrypoint.
// Exports the Express app so Vercel can invoke it.

const app = require('../app');

module.exports = app;
