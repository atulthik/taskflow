require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/database');
const { initSocket } = require('./sockets/socketServer');
const workerManager = require('./workers/workerManager');
const jobRecovery = require('./queue/jobRecovery');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('MongoDB Connected...');

    // Initialize Worker Manager
    workerManager.init();
    
    // Start Job Recovery Service
    jobRecovery.start();

    server.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

startServer();

// Graceful Shutdown
const shutdown = async () => {
  console.log('\nShutting down server gracefully...');
  
  // Stop job recovery
  jobRecovery.stop();
  
  // Stop workers
  await workerManager.shutdown();
  
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
