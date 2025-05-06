/**
 * A script to log device routes and ensure they're properly registered
 * 
 * To run: node fix-routes.js
 */

const express = require('express');
const deviceController = require('./dist/client/controllers/deviceController');
const deviceRoutes = require('./dist/client/routes/deviceRoutes').default;

// Create a test express app
const app = express();

// Mount the device routes
app.use('/client/api/devices', deviceRoutes);

// List all registered routes
console.log('All registered routes:');
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    // Routes registered directly on the app
    console.log(`${Object.keys(middleware.route.methods).join(',')} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    // Router middleware
    middleware.handle.stack.forEach((handler) => {
      if (handler.route) {
        const path = handler.route.path;
        const methods = Object.keys(handler.route.methods).join(',');
        console.log(`${methods} /client/api/devices${path}`);
      }
    });
  }
});

// Verify test connection route specifically
const testConnectionRoute = deviceRoutes.stack.find(layer => 
  layer.route && layer.route.path === '/:id/test' && layer.route.methods.post
);

if (testConnectionRoute) {
  console.log('\n✅ Test connection route is properly registered:');
  console.log(`POST /client/api/devices/:id/test -> ${testConnectionRoute.handle.name}`);
} else {
  console.log('\n❌ Test connection route is NOT found in the router!');
  
  // Suggest a fix
  console.log('\nSuggested fix for deviceRoutes.ts:');
  console.log(`
// Make sure this line is in your deviceRoutes.ts file:
router.post('/:id/test', deviceController.testDeviceConnection as express.RequestHandler);
  `);
}

console.log('\nTo diagnose the routing issue:');
console.log('1. Ensure server.ts mounts the clientRouter at "/client/api"');
console.log('2. Ensure clientRouter in routes/index.ts mounts deviceRoutes at "/devices"');
console.log('3. Check that authentication middleware is not blocking the request');
console.log('4. Verify the route is registered and accessible');