import { startServer } from './server';

// Start the server
startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

console.log('Server initialization complete, waiting for connections...');
