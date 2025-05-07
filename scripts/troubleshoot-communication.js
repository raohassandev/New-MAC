/**
 * Communication Module Troubleshooting Script
 * 
 * This script helps diagnose and fix common issues with the communication module.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Base directory
const baseDir = path.resolve(__dirname, '..');
const serverDir = path.join(baseDir, 'server');
const communicationDir = path.join(serverDir, 'src', 'communication');

/**
 * Run a command and display output
 */
function runCommand(command, description) {
  console.log(chalk.cyan(`Running: ${description}`));
  try {
    const output = execSync(command, { stdio: 'pipe' }).toString();
    console.log(chalk.green(`✓ Success: ${description}`));
    return output;
  } catch (error) {
    console.error(chalk.red(`✗ Failed: ${description}`));
    console.error(chalk.red(error.message));
    if (error.stdout) console.error(chalk.yellow(error.stdout.toString()));
    if (error.stderr) console.error(chalk.red(error.stderr.toString()));
    return null;
  }
}

/**
 * Check if a file or directory exists
 */
function checkExists(path, name) {
  if (fs.existsSync(path)) {
    console.log(chalk.green(`✓ ${name} exists`));
    return true;
  } else {
    console.log(chalk.red(`✗ ${name} does not exist!`));
    return false;
  }
}

/**
 * Check for serial ports
 */
async function checkSerialPorts() {
  console.log(chalk.cyan('Checking available serial ports...'));
  
  try {
    // Try to execute list-ports.js if it exists
    const listPortsScript = path.join(serverDir, 'list-ports.js');
    
    if (fs.existsSync(listPortsScript)) {
      execSync(`node ${listPortsScript}`, { stdio: 'inherit' });
    } else {
      // Use the serialport module directly
      const SerialPort = require('serialport');
      const ports = await SerialPort.SerialPort.list();
      
      if (ports.length === 0) {
        console.log(chalk.yellow('⚠ No serial ports found'));
      } else {
        console.log(chalk.green(`Found ${ports.length} serial ports:`));
        ports.forEach((port, i) => {
          console.log(chalk.cyan(`${i+1}. Path: ${port.path}`));
          console.log(`   Manufacturer: ${port.manufacturer || 'Unknown'}`);
          console.log(`   Serial Number: ${port.serialNumber || 'Unknown'}`);
          console.log(`   Product ID: ${port.productId || 'Unknown'}`);
          console.log(`   Vendor ID: ${port.vendorId || 'Unknown'}`);
        });
      }
    }
  } catch (error) {
    console.error(chalk.red('Error checking serial ports:'), error.message);
    console.log(chalk.yellow('Do you have the serialport package installed?'));
    console.log(chalk.yellow('Run: npm install serialport'));
  }
}

/**
 * Check communication module components
 */
function checkComponents() {
  console.log(chalk.cyan('Checking communication module components...'));
  
  // Required directories
  const dirs = [
    { path: path.join(communicationDir, 'core'), name: 'Core directory' },
    { path: path.join(communicationDir, 'protocols'), name: 'Protocols directory' },
    { path: path.join(communicationDir, 'services'), name: 'Services directory' },
    { path: path.join(communicationDir, 'utils'), name: 'Utils directory' },
    { path: path.join(communicationDir, 'config'), name: 'Config directory' }
  ];
  
  // Required files
  const files = [
    { path: path.join(communicationDir, 'index.ts'), name: 'Main module entry point' },
    { path: path.join(communicationDir, 'core', 'device.interface.ts'), name: 'Device interface' },
    { path: path.join(communicationDir, 'core', 'device.concrete.ts'), name: 'Concrete device class' },
    { path: path.join(communicationDir, 'protocols', 'modbus', 'index.ts'), name: 'Modbus index' },
    { path: path.join(communicationDir, 'services', 'index.ts'), name: 'Services index' },
    { path: path.join(communicationDir, 'services', 'pollingService.ts'), name: 'Polling service' }
  ];
  
  // Check directories
  let dirsOk = true;
  for (const dir of dirs) {
    if (!checkExists(dir.path, dir.name)) {
      dirsOk = false;
    }
  }
  
  // Check files
  let filesOk = true;
  for (const file of files) {
    if (!checkExists(file.path, file.name)) {
      filesOk = false;
    }
  }
  
  return dirsOk && filesOk;
}

/**
 * Check build artifacts
 */
function checkBuild() {
  console.log(chalk.cyan('Checking build artifacts...'));
  
  // Check if dist directory exists
  const distDir = path.join(serverDir, 'dist');
  if (!checkExists(distDir, 'dist directory')) {
    console.log(chalk.yellow('⚠ dist directory not found, need to build first'));
    return false;
  }
  
  // Check communication module artifacts
  const communicationBuildDir = path.join(distDir, 'communication');
  if (!checkExists(communicationBuildDir, 'communication build directory')) {
    console.log(chalk.yellow('⚠ communication module not built'));
    return false;
  }
  
  return true;
}

/**
 * Test device connection
 */
async function testConnection() {
  console.log(chalk.blue('=== Test Device Connection ==='));
  console.log(chalk.cyan('This will attempt to connect to a Modbus device'));
  
  // Ask for connection details
  const connectionType = await new Promise(resolve => {
    rl.question(chalk.yellow('Connection type (tcp/rtu): '), resolve);
  });
  
  if (connectionType.toLowerCase() === 'tcp') {
    // Get TCP connection details
    const host = await new Promise(resolve => {
      rl.question(chalk.yellow('Host IP: '), resolve);
    });
    
    const port = await new Promise(resolve => {
      rl.question(chalk.yellow('Port (default: 502): '), answer => resolve(answer || '502'));
    });
    
    const unitId = await new Promise(resolve => {
      rl.question(chalk.yellow('Unit ID (default: 1): '), answer => resolve(answer || '1'));
    });
    
    // Create test script
    const testScript = `
const ModbusRTU = require('modbus-serial');
const client = new ModbusRTU();

async function testTcpConnection() {
  try {
    console.log('Connecting to ${host}:${port} with unit ID ${unitId}...');
    await client.connectTCP('${host}', { port: ${port} });
    client.setID(${unitId});
    console.log('Connected successfully!');
    
    // Try to read some registers
    try {
      console.log('Reading 10 holding registers from address 0...');
      const result = await client.readHoldingRegisters(0, 10);
      console.log('Read successful!');
      console.log('Data:', result.data);
    } catch (readError) {
      console.error('Error reading registers:', readError.message);
    }
    
    // Close connection
    await client.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('Connection error:', error.message);
  }
}

testTcpConnection();
`;
    
    // Write test script to temp file
    const testScriptPath = path.join(baseDir, 'scripts', 'temp-test-tcp.js');
    fs.writeFileSync(testScriptPath, testScript);
    
    // Run test script
    try {
      console.log(chalk.cyan('Testing TCP connection...'));
      execSync(`node ${testScriptPath}`, { stdio: 'inherit' });
    } catch (error) {
      console.error(chalk.red('Error running test script:'), error.message);
    }
    
    // Clean up
    fs.unlinkSync(testScriptPath);
    
  } else if (connectionType.toLowerCase() === 'rtu') {
    // Get RTU connection details
    const port = await new Promise(resolve => {
      rl.question(chalk.yellow('Serial port (e.g. /dev/ttyUSB0): '), resolve);
    });
    
    const baudRate = await new Promise(resolve => {
      rl.question(chalk.yellow('Baud rate (default: 9600): '), answer => resolve(answer || '9600'));
    });
    
    const parity = await new Promise(resolve => {
      rl.question(chalk.yellow('Parity (none/even/odd, default: none): '), answer => resolve(answer || 'none'));
    });
    
    const unitId = await new Promise(resolve => {
      rl.question(chalk.yellow('Unit ID (default: 1): '), answer => resolve(answer || '1'));
    });
    
    // Create test script
    const testScript = `
const ModbusRTU = require('modbus-serial');
const client = new ModbusRTU();

async function testRtuConnection() {
  try {
    console.log('Connecting to ${port} with baud rate ${baudRate}, parity ${parity}, unit ID ${unitId}...');
    await client.connectRTUBuffered('${port}', {
      baudRate: ${baudRate},
      parity: '${parity}',
      dataBits: 8,
      stopBits: 1
    });
    client.setID(${unitId});
    console.log('Connected successfully!');
    
    // Try to read some registers
    try {
      console.log('Reading 10 holding registers from address 0...');
      const result = await client.readHoldingRegisters(0, 10);
      console.log('Read successful!');
      console.log('Data:', result.data);
    } catch (readError) {
      console.error('Error reading registers:', readError.message);
    }
    
    // Close connection
    await client.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('Connection error:', error.message);
  }
}

testRtuConnection();
`;
    
    // Write test script to temp file
    const testScriptPath = path.join(baseDir, 'scripts', 'temp-test-rtu.js');
    fs.writeFileSync(testScriptPath, testScript);
    
    // Run test script
    try {
      console.log(chalk.cyan('Testing RTU connection...'));
      execSync(`node ${testScriptPath}`, { stdio: 'inherit' });
    } catch (error) {
      console.error(chalk.red('Error running test script:'), error.message);
    }
    
    // Clean up
    fs.unlinkSync(testScriptPath);
  } else {
    console.log(chalk.red('Invalid connection type. Please enter "tcp" or "rtu".'));
  }
}

/**
 * Main troubleshooting function
 */
async function troubleshoot() {
  console.log(chalk.blue('=== Communication Module Troubleshooting ==='));
  
  // Check components
  const componentsOk = checkComponents();
  if (!componentsOk) {
    console.log(chalk.yellow('⚠ Some communication module components are missing!'));
    const answer = await new Promise(resolve => {
      rl.question(chalk.yellow('Would you like to reinstall the communication module? (y/n): '), resolve);
    });
    
    if (answer.toLowerCase() === 'y') {
      // Run setup script
      console.log(chalk.cyan('Running setup script...'));
      runCommand('node scripts/setup-communication-module.js', 'Setting up communication module');
    }
  } else {
    console.log(chalk.green('✓ All communication module components are present'));
  }
  
  // Check build
  const buildOk = checkBuild();
  if (!buildOk) {
    console.log(chalk.yellow('⚠ Communication module not built correctly!'));
    const answer = await new Promise(resolve => {
      rl.question(chalk.yellow('Would you like to rebuild the communication module? (y/n): '), resolve);
    });
    
    if (answer.toLowerCase() === 'y') {
      // Run build
      console.log(chalk.cyan('Building communication module...'));
      runCommand('npm run build', 'Building communication module');
    }
  } else {
    console.log(chalk.green('✓ Communication module built correctly'));
  }
  
  // Check serial ports
  const checkPorts = await new Promise(resolve => {
    rl.question(chalk.yellow('Would you like to check available serial ports? (y/n): '), resolve);
  });
  
  if (checkPorts.toLowerCase() === 'y') {
    await checkSerialPorts();
  }
  
  // Test connection
  const testConn = await new Promise(resolve => {
    rl.question(chalk.yellow('Would you like to test a Modbus device connection? (y/n): '), resolve);
  });
  
  if (testConn.toLowerCase() === 'y') {
    await testConnection();
  }
  
  // Final message
  console.log(chalk.green('✓ Troubleshooting complete'));
  rl.close();
}

// Run the troubleshooting
troubleshoot().catch(error => {
  console.error(chalk.red('Error during troubleshooting:'), error);
  rl.close();
  process.exit(1);
});