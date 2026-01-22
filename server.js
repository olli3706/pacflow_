// Local development server only.
// Vercel uses api/index.js -> app.js (no listen).

require('dotenv').config();

const app = require('./app');
const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
    console.log(`\n🚀 PackFlow server running at http://localhost:${PORT}/`);
    console.log('📁 Serving static files from: ./public');
    console.log('🔒 Authentication: Enabled');
    console.log('⏱️  Rate limiting: Enabled');
    console.log('\nPress Ctrl+C to stop the server\n');
});
