import express from 'express';
import fs from 'fs';
import path from 'path';
import { modbusLogger } from '../../utils/logger';

const router = express.Router();

// Create a separate export for the tracking function
export type ModbusRequestData = {
  requestId: string;
  deviceId?: string;
  status: 'success' | 'failed' | 'timeout';
  elapsedMs: number;
  error?: string;
  readings?: number;
};

// Define types for stats tracking
interface DeviceStats {
  total: number;
  success: number;
  failed: number;
  timeout: number;
  avgResponseTime: number;
}

interface MinuteStats {
  total: number;
  success: number;
  failed: number;
  timeout: number;
}

interface ErrorEntry {
  timestamp: Date;
  requestId: string;
  deviceId?: string;
  error?: string;
  elapsedMs: number;
}

interface RequestEntry {
  timestamp: Date;
  requestId: string;
  deviceId?: string;
  status: 'success' | 'failed' | 'timeout';
  elapsedMs: number;
  readings?: number;
}

// Store Modbus read statistics in memory
let modbusStats = {
  totalRequests: 0,
  successRequests: 0,
  failedRequests: 0,
  timeoutRequests: 0,
  requestsByDevice: {} as Record<string, DeviceStats>,
  requestsByMinute: {} as Record<string, MinuteStats>,
  errors: [] as ErrorEntry[],
  lastRequests: [] as RequestEntry[] // Store the last 50 requests
};

// Initialize counters for API rate tracking
const minutelyCounters: Record<string, number> = {};

// Add a new API request to the stats
export const trackModbusRequest = (requestData: ModbusRequestData) => {
  const now = new Date();
  const minute = `${now.getHours()}:${now.getMinutes()}`;
  
  // Update total counters
  modbusStats.totalRequests++;
  
  if (requestData.status === 'success') {
    modbusStats.successRequests++;
  } else if (requestData.status === 'failed') {
    modbusStats.failedRequests++;
    // Store error info for the dashboard
    modbusStats.errors.push({
      timestamp: now,
      requestId: requestData.requestId,
      deviceId: requestData.deviceId,
      error: requestData.error,
      elapsedMs: requestData.elapsedMs
    });
    
    // Limit to 100 latest errors
    if (modbusStats.errors.length > 100) {
      modbusStats.errors.shift();
    }
  } else if (requestData.status === 'timeout') {
    modbusStats.timeoutRequests++;
  }
  
  // Track by device
  if (requestData.deviceId && typeof requestData.deviceId === 'string') {
    const deviceId = requestData.deviceId;
    
    if (!modbusStats.requestsByDevice[deviceId]) {
      modbusStats.requestsByDevice[deviceId] = {
        total: 0,
        success: 0,
        failed: 0,
        timeout: 0,
        avgResponseTime: 0
      };
    }
    
    const deviceStats = modbusStats.requestsByDevice[deviceId];
    deviceStats.total++;
    
    if (requestData.status === 'success') {
      deviceStats.success++;
    } else if (requestData.status === 'failed') {
      deviceStats.failed++;
    } else if (requestData.status === 'timeout') {
      deviceStats.timeout++;
    }
    
    // Update average response time with type safety
    const prevAvg = deviceStats.avgResponseTime;
    const prevCount = deviceStats.total - 1; // Previous count 
    const newValue = requestData.elapsedMs;
    
    // Calculate new average
    deviceStats.avgResponseTime = 
      (prevAvg * prevCount + newValue) / deviceStats.total;
  }
  
  // Track by minute
  const minuteKey = minute; // Explicitly define it as a variable to help TypeScript
  if (!modbusStats.requestsByMinute[minuteKey]) {
    modbusStats.requestsByMinute[minuteKey] = {
      total: 0,
      success: 0,
      failed: 0,
      timeout: 0
    };
  }
  
  const minuteStats = modbusStats.requestsByMinute[minuteKey];
  minuteStats.total++;
  
  if (requestData.status === 'success') {
    minuteStats.success++;
  } else if (requestData.status === 'failed') {
    minuteStats.failed++;
  } else if (requestData.status === 'timeout') {
    minuteStats.timeout++;
  }
  
  // Add to recent requests list
  modbusStats.lastRequests.unshift({
    timestamp: now,
    requestId: requestData.requestId,
    deviceId: requestData.deviceId,
    status: requestData.status,
    elapsedMs: requestData.elapsedMs,
    readings: requestData.readings
  });
  
  // Keep only the last 50 requests
  if (modbusStats.lastRequests.length > 50) {
    modbusStats.lastRequests.pop();
  }
  
  // Clean up old minute stats (keep only last 60 minutes)
  const minuteKeys = Object.keys(modbusStats.requestsByMinute);
  if (minuteKeys.length > 60) {
    // Sort keys chronologically (HH:MM format)
    const oldestKey = minuteKeys.sort((a, b) => {
      // Simple string comparison works for HH:MM format if within the same day
      return a.localeCompare(b);
    })[0];
    
    if (oldestKey) {
      delete modbusStats.requestsByMinute[oldestKey];
    }
  }
  
  // Log the tracking
  modbusLogger.info(`Tracked Modbus request [${requestData.requestId}]: ${requestData.status}`, requestData);
};

// Get Modbus stats dashboard data
router.get('/stats', (req, res) => {
  res.json({
    timestamp: new Date(),
    stats: modbusStats
  });
});

// Reset stats (Admin only)
router.post('/stats/reset', (req, res) => {
  // In a real implementation, you'd add authentication here
  modbusStats = {
    totalRequests: 0,
    successRequests: 0,
    failedRequests: 0,
    timeoutRequests: 0,
    requestsByDevice: {},
    requestsByMinute: {},
    errors: [],
    lastRequests: []
  };
  
  res.json({ message: 'Stats reset successfully', timestamp: new Date() });
});

// Get the latest log entries
router.get('/logs', (req, res) => {
  const logType = req.query.type || 'modbus';
  let logPath: string;
  
  // Determine which log file to read based on the type
  switch (logType) {
    case 'modbus':
      logPath = path.join(__dirname, '../../../logs/modbus/modbus.log');
      break;
    case 'api':
      logPath = path.join(__dirname, '../../../logs/api/api.log');
      break;
    case 'access':
      logPath = path.join(__dirname, '../../../logs/access.log');
      break;
    default:
      logPath = path.join(__dirname, '../../../logs/modbus/modbus.log');
  }
  
  try {
    if (!fs.existsSync(logPath)) {
      // Check if the directory structure is different (for development/production)
      const altLogPath = path.join(__dirname, '../../../', logPath.split('/logs/')[1]);
      
      if (fs.existsSync(altLogPath)) {
        logPath = altLogPath;
      } else {
        return res.status(404).json({ 
          message: 'Log file not found', 
          path: logPath,
          altPath: altLogPath
        });
      }
    }
    
    // Get the last 200 lines of the log file
    const { execSync } = require('child_process');
    const logLines = execSync(`tail -n 200 "${logPath}"`).toString().split('\n');
    
    res.json({
      timestamp: new Date(),
      logType,
      logPath,
      lines: logLines
    });
  } catch (error: any) {
    res.status(500).json({
      message: 'Error reading log file',
      logType,
      logPath,
      error: error.message
    });
  }
});

// Serve the log viewer HTML
router.get('/logs-viewer', (req, res) => {
  const viewerPath = path.join(__dirname, '../../../logs-viewer.html');
  
  if (fs.existsSync(viewerPath)) {
    res.sendFile(viewerPath);
  } else {
    res.status(404).send('Log viewer file not found');
  }
});

// Serve the dashboard HTML page
router.get('/', (req, res) => {
  // Handle both development and production paths
  const developmentPath = path.join(__dirname, 'monitoringDashboard.html');
  const productionPath = path.join(__dirname, '../../../dist/client/routes/monitoringDashboard.html');
  
  // Check if dashboard file exists in development path
  if (fs.existsSync(developmentPath)) {
    res.sendFile(developmentPath);
  } 
  // Check production path as fallback
  else if (fs.existsSync(productionPath)) {
    res.sendFile(productionPath);
  } 
  // If neither exists, send HTML directly
  else {
    // Create a simple HTML dashboard as fallback
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Modbus API Monitoring</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .card { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        button { padding: 8px 16px; background: #4CAF50; color: white; border: none; cursor: pointer; }
      </style>
    </head>
    <body>
      <h1>Modbus API Monitoring Dashboard</h1>
      <p>This is a simplified monitoring dashboard for the Modbus API.</p>
      
      <div class="card">
        <h2>API Statistics</h2>
        <div id="stats">Loading...</div>
        <button onclick="fetchStats()">Refresh Stats</button>
      </div>
      
      <div class="card">
        <h2>Recent Requests</h2>
        <div id="requests">Loading...</div>
      </div>
      
      <script>
        async function fetchStats() {
          try {
            const response = await fetch('/client/api/monitoring/stats');
            const data = await response.json();
            document.getElementById('stats').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            
            if (data.stats && data.stats.lastRequests) {
              let requestsHtml = '<table><tr><th>Time</th><th>Device</th><th>Status</th><th>Duration</th></tr>';
              data.stats.lastRequests.forEach(req => {
                requestsHtml += '<tr>' +
                  '<td>' + new Date(req.timestamp).toLocaleString() + '</td>' +
                  '<td>' + (req.deviceId || '-') + '</td>' +
                  '<td>' + req.status + '</td>' +
                  '<td>' + req.elapsedMs + 'ms</td>' +
                  '</tr>';
              });
              requestsHtml += '</table>';
              document.getElementById('requests').innerHTML = requestsHtml;
            }
          } catch (error) {
            console.error('Error fetching stats:', error);
            document.getElementById('stats').innerHTML = 'Error loading stats: ' + error.message;
          }
        }
        
        // Fetch stats on load
        fetchStats();
        // Refresh every 10 seconds
        setInterval(fetchStats, 10000);
      </script>
    </body>
    </html>
    `;
    
    res.send(html);
  }
});

export default router;