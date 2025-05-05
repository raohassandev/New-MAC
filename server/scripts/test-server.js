const http = require('http');
const { MongoClient } = require('mongodb');

// Create a simple HTTP server
const server = http.createServer(async (req, res) => {
  console.log(`Received request for ${req.url}`);
  
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'OK', timestamp: new Date() }));
  } 
  else if (req.url === '/devices') {
    try {
      // Connect to MongoDB
      const client = new MongoClient('mongodb://localhost:27017');
      await client.connect();
      console.log('Connected to MongoDB');
      
      // Get devices from the client database
      const db = client.db('client');
      const devices = await db.collection('devices').find({}).toArray();
      
      // Send response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ devices }));
      
      // Close the connection
      await client.close();
    } catch (error) {
      console.error('Error querying devices:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Database error', message: error.message }));
    }
  }
  else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Start the server on port 3335
const PORT = 3335;
server.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}/`);
  console.log(`Try accessing these endpoints:`);
  console.log(`- http://localhost:${PORT}/health`);
  console.log(`- http://localhost:${PORT}/devices`);
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});