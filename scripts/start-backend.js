/**
 * Development server startup script
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Sustainability Analyzer Backend...');

const serverProcess = spawn('node', [path.join(__dirname, '../api/server.js')], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

serverProcess.on('close', (code) => {
  console.log(`🛑 Server process exited with code ${code}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  serverProcess.kill('SIGINT');
});