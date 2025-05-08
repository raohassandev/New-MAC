/**
 * This script checks if required dependencies are installed and installs them if not
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define the dependencies we want to ensure are installed
const requiredDependencies = [
  'express-rate-limit',
  'morgan',
  'winston'
];

function checkDependencies() {
  console.log('Checking required dependencies...');
  
  try {
    // Read package.json to see what's already installed
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};
    
    // Check which dependencies are missing
    const missingDependencies = requiredDependencies.filter(
      dep => !dependencies[dep] && !devDependencies[dep]
    );
    
    if (missingDependencies.length === 0) {
      console.log('✅ All required dependencies are installed.');
      return;
    }
    
    // Install missing dependencies
    console.log(`Installing missing dependencies: ${missingDependencies.join(', ')}`);
    
    const installCommand = `npm install --save ${missingDependencies.join(' ')}`;
    execSync(installCommand, { stdio: 'inherit' });
    
    console.log('✅ Dependencies installed successfully.');
  } catch (error) {
    console.error('❌ Error checking or installing dependencies:', error);
    process.exit(1);
  }
}

// Run the check
checkDependencies();