/**
 * Production server setup
 */

const app = require('./sustainability-analyzer.js');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🌱 Sustainability Analyzer API Server`);
  console.log(`🚀 Running on port ${PORT}`);
  console.log(`📊 Ready to analyze sustainability reports`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});