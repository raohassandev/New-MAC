/**
 * Examples of using the parameterized auto-polling service
 */

import { startAutoPollingService } from './autoPolling.service';

// Example 1: Start with default interval (60 seconds)
async function example1() {
  await startAutoPollingService();
  // This will use the default 60 seconds interval
}

// Example 2: Start with 30 seconds interval
async function example2() {
  await startAutoPollingService(30);
  // All devices will be polled every 30 seconds by default
}

// Example 3: Start with 5 minutes interval for low-frequency monitoring
async function example3() {
  await startAutoPollingService(300); // 5 minutes = 300 seconds
  // Useful for systems that don't need real-time updates
}

// Example 4: Start with rapid polling (10 seconds - minimum allowed)
async function example4() {
  await startAutoPollingService(10);
  // 10 seconds is the minimum interval enforced by the service
}

// Example 5: API endpoint usage
/*
POST /api/system/polling/start
Body: {
  "intervalSeconds": 45
}

Response: {
  "success": true,
  "message": "Auto-polling service started successfully with 45 seconds interval",
  "intervalSeconds": 45
}
*/

// Example 6: Direct service call in server initialization
/*
In server.ts or app.ts:

import { startAutoPollingService } from './client/services/autoPolling.service';

// Start auto-polling with 2 minutes interval on server startup
await startAutoPollingService(120);
*/

// Example 7: Environment variable configuration
/*
const DEFAULT_POLLING_INTERVAL = parseInt(process.env.POLLING_INTERVAL_SECONDS) || 60;
await startAutoPollingService(DEFAULT_POLLING_INTERVAL);
*/

export {};