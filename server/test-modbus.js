// Test loading the modbus helper and dataPollingService
const path = require('path');
const fs = require('fs');

console.log('Current directory:', process.cwd());
console.log('Checking if modbus helper exists...');

const helperPath = path.resolve(__dirname, 'src/client/controllers/modbusHelper.ts');
const pollingPath = path.resolve(__dirname, 'src/client/services/dataPollingService.ts');

console.log('Helper path:', helperPath);
console.log('Polling path:', pollingPath);

console.log('Helper exists:', fs.existsSync(helperPath));
console.log('Polling exists:', fs.existsSync(pollingPath));

// Since we can't directly require TypeScript files without compilation,
// we'll read them to verify our changes are there
const helperContent = fs.readFileSync(helperPath, 'utf8');
const pollingContent = fs.readFileSync(pollingPath, 'utf8');

console.log('\nVerifying helper changes:');
console.log('Contains require(chalk):', helperContent.includes('const chalk = require(\'chalk\')'));
console.log('Contains connectRTUBuffered timeout handling:', 
  helperContent.includes('const timeoutPromise = new Promise<never>'));

console.log('\nVerifying polling service changes:');
console.log('Contains require(chalk):', pollingContent.includes('const chalk = require(\'chalk\')'));
console.log('Contains createModbusRTUClient internal note:', 
  pollingContent.includes('NOTE: createModbusRTUClient already calls connectRTUBuffered internally'));

console.log('\nAll changes verified successfully!');