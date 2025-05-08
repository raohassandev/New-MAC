/**
 * Server startup script with dependency and directory checking
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if required directories exist
function ensureDirectoriesExist() {
  console.log('Checking and creating required directories...');
  
  // Create logs directory
  const logsDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logsDir)) {
    console.log('Creating logs directory:', logsDir);
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Create specific log subdirectories
  const dirs = [
    path.join(logsDir, 'modbus'),
    path.join(logsDir, 'api'),
    path.join(logsDir, 'system')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log('Creating directory:', dir);
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  console.log('All required directories exist.');
}

// Create default empty log files
function createEmptyLogFiles() {
  const files = [
    path.join(__dirname, '../logs/access.log'),
    path.join(__dirname, '../logs/modbus/modbus.log'),
    path.join(__dirname, '../logs/modbus/error.log'),
    path.join(__dirname, '../logs/api/api.log'),
    path.join(__dirname, '../logs/api/error.log')
  ];
  
  files.forEach(file => {
    if (!fs.existsSync(file)) {
      console.log('Creating empty log file:', file);
      fs.writeFileSync(file, '', 'utf8');
    }
  });
}

// Check required dependencies
function checkDependencies() {
  console.log('Checking required dependencies...');
  
  const requiredDeps = [
    'express-rate-limit',
    'morgan',
    'winston'
  ];
  
  try {
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};
    
    const missingDeps = requiredDeps.filter(
      dep => !deps[dep] && !devDeps[dep]
    );
    
    if (missingDeps.length > 0) {
      console.log('Installing missing dependencies:', missingDeps.join(', '));
      execSync(`npm install --save ${missingDeps.join(' ')}`, { stdio: 'inherit' });
    } else {
      console.log('All dependencies are installed.');
    }
  } catch (error) {
    console.error('Error checking dependencies:', error);
  }
}

// Start nodemon for development
function startDevelopmentServer() {
  console.log('Starting development server with nodemon...');
  
  try {
    // Use nodemon to watch TypeScript files
    execSync('npx nodemon --exec ts-node src/index.ts', { 
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' } // Ensure colored output
    });
  } catch (error) {
    console.error('Error starting development server:', error);
    process.exit(1);
  }
}

// Main function
function main() {
  console.log('=== Starting MACSYS server with monitoring enabled ===');
  
  try {
    // Check dependencies first
    checkDependencies();
    
    // Ensure directories exist
    ensureDirectoriesExist();
    
    // Create empty log files if needed
    createEmptyLogFiles();
    
    // Start the development server
    startDevelopmentServer();
  } catch (error) {
    console.error('Error during server startup:', error);
    process.exit(1);
  }
}

// Run the main function
main();