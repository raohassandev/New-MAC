const os = require('os');

// Get memory information
const totalMemory = os.totalmem();
const freeMemory = os.freemem();
const usedMemory = totalMemory - freeMemory;
const memoryUsage = Math.round((usedMemory / totalMemory) * 100);

console.log('Memory Information:');
console.log(`Total Memory: ${(totalMemory / (1024 * 1024 * 1024)).toFixed(2)} GB`);
console.log(`Free Memory: ${(freeMemory / (1024 * 1024 * 1024)).toFixed(2)} GB`);
console.log(`Used Memory: ${(usedMemory / (1024 * 1024 * 1024)).toFixed(2)} GB`);
console.log(`Memory Usage: ${memoryUsage}%`);

// Get CPU information
const loadAverage = os.loadavg();
const numCPUs = os.cpus().length;
const cpuUsage = Math.min(100, Math.round((loadAverage[0] / numCPUs) * 100));

console.log('\nCPU Information:');
console.log(`Number of CPUs: ${numCPUs}`);
console.log(`Load Average (1min, 5min, 15min): ${loadAverage.join(', ')}`);
console.log(`CPU Usage (based on 1min avg): ${cpuUsage}%`);

// System uptime
const uptimeSeconds = os.uptime();
const days = Math.floor(uptimeSeconds / (24 * 60 * 60));
const hours = Math.floor((uptimeSeconds % (24 * 60 * 60)) / (60 * 60));
const minutes = Math.floor((uptimeSeconds % (60 * 60)) / 60);
const uptime = `${days}d ${hours}h ${minutes}m`;

console.log(`\nSystem Uptime: ${uptime}`);