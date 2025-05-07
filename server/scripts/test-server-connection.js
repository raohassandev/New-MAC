/**
 * Test Server Connection Script
 *
 * This script tests connection to the MACSYS server and checks the health endpoint.
 * Use it to verify server is running correctly on the expected port.
 */

import { request } from 'http';
import { execSync } from 'child_process';

// Configuration
const DEFAULT_PORT = 3334;
const TEST_ENDPOINTS = [
  '/', // Root endpoint
  '/health', // Health check
  '/debug/db', // Database status
];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Get the port from environment or use default
const getTargetPort = () => {
  try {
    // Try to read from .env file if it exists
    let port = DEFAULT_PORT;

    try {
      // Check if the .env file exists and contains PORT
      const envContent = execSync('cat ../.env 2>/dev/null || echo ""').toString();
      const portMatch = envContent.match(/PORT=(\d+)/);
      if (portMatch && portMatch[1]) {
        port = parseInt(portMatch[1], 10);
        console.log(`${colors.blue}Found PORT=${port} in .env file${colors.reset}`);
      }
    } catch (error) {
      // Ignore error if .env file doesn't exist
    }

    // Check environment variable (overrides .env file)
    if (process.env.PORT) {
      port = parseInt(process.env.PORT, 10);
      console.log(`${colors.blue}Using PORT=${port} from environment variable${colors.reset}`);
    }

    return port;
  } catch (error) {
    console.error(`${colors.red}Error determining port:${colors.reset}`, error.message);
    return DEFAULT_PORT;
  }
};

// Test a single endpoint
const testEndpoint = (port, endpoint) => {
  return new Promise((resolve, reject) => {
    console.log(
      `${colors.cyan}Testing endpoint:${colors.reset} http://localhost:${port}${endpoint}`,
    );

    const options = {
      hostname: 'localhost',
      port: port,
      path: endpoint,
      method: 'GET',
      timeout: 5000, // 5 second timeout
    };

    const req = request(options, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        let responseBody;
        try {
          // Try to parse as JSON if possible
          responseBody = JSON.parse(data);
        } catch (e) {
          // Otherwise use as string
          responseBody = data.substring(0, 100) + (data.length > 100 ? '...' : '');
        }

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseBody,
        });
      });
    });

    req.on('error', error => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.end();
  });
};

// Main function to test all endpoints
const testServer = async () => {
  console.log(
    `\n${colors.magenta}================= SERVER CONNECTION TEST =================${colors.reset}`,
  );
  console.log(
    `${colors.magenta}Testing MACSYS server connection ${new Date().toISOString()}${colors.reset}\n`,
  );

  const port = getTargetPort();
  console.log(`${colors.blue}Target port:${colors.reset} ${port}\n`);

  // Check for running processes on this port
  try {
    console.log(`${colors.blue}Checking processes using port ${port}:${colors.reset}`);
    // Different command for different platforms
    const cmd =
      process.platform === 'win32'
        ? `netstat -ano | findstr :${port}`
        : `lsof -i :${port} || echo "No process found using port ${port}"`;

    const result = execSync(cmd).toString();
    console.log(result || 'No process found using port');
  } catch (error) {
    console.log(`${colors.yellow}No process found using port ${port}${colors.reset}`);
  }

  console.log(`\n${colors.blue}Testing endpoints:${colors.reset}`);

  let hasErrors = false;

  // Test all endpoints
  for (const endpoint of TEST_ENDPOINTS) {
    try {
      const response = await testEndpoint(port, endpoint);

      // Check if the response is successful (2xx status code)
      if (response.statusCode >= 200 && response.statusCode < 300) {
        console.log(`${colors.green}✓ ${endpoint} - Status:${colors.reset} ${response.statusCode}`);
        console.log(`  Response: ${JSON.stringify(response.body, null, 2).substring(0, 150)}...\n`);
      } else {
        console.log(
          `${colors.yellow}⚠ ${endpoint} - Status:${colors.reset} ${response.statusCode}`,
        );
        console.log(`  Response: ${JSON.stringify(response.body, null, 2).substring(0, 150)}...\n`);
        hasErrors = true;
      }
    } catch (error) {
      console.log(`${colors.red}✗ ${endpoint} - Error:${colors.reset} ${error.message}\n`);
      hasErrors = true;
    }
  }

  console.log(
    `${colors.magenta}====================== TEST SUMMARY ======================${colors.reset}`,
  );
  if (hasErrors) {
    console.log(
      `${colors.yellow}Some tests failed. The server may not be running correctly on port ${port}.${colors.reset}`,
    );
    console.log(`${colors.yellow}Try starting the server with: npm start${colors.reset}`);
  } else {
    console.log(
      `${colors.green}All tests passed! Server is running correctly on port ${port}.${colors.reset}`,
    );
  }
  console.log(
    `${colors.magenta}==========================================================${colors.reset}\n`,
  );
};

// Run the tests
testServer().catch(error => {
  console.error(`${colors.red}Test failed with error:${colors.reset}`, error);
  process.exit(1);
});
