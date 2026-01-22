// Vercel serverless function wrapper for Express app
// This file allows Vercel to run the Express app as a serverless function

const app = require('../server.js');

// Export the Express app as a serverless function
// Vercel will handle the request/response conversion
module.exports = app;
