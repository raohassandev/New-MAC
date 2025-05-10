import { startServer } from './server';

// Start the server
startServer()
  .then(server => {
    console.log('Server initialization complete, waiting for connections...');

    // Handle server shutdown
    const gracefulShutdown = () => {
      console.log('Shutting down server gracefully...');
      
      // Stop the auto-polling service first
      try {
        const { stopAutoPollingService } = require('./client/services/autoPolling.service');
        stopAutoPollingService();
        console.log('Auto-polling service stopped successfully');
      } catch (error) {
        console.warn('Failed to stop auto-polling service:', error);
      }
      
      // Close the server
      server.close(() => {
        console.log('Server closed successfully');
        process.exit(0);
      });
    };

    // Listen for termination signals
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown); 
  }) 
  .catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
