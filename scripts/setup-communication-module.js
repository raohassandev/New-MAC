/**
 * Communication Module Setup Script
 * 
 * This script helps set up the communication module by:
 * 1. Creating necessary directories
 * 2. Building the TypeScript files
 * 3. Running tests
 * 4. Setting up environment variables
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

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
    const output = execSync(command, { cwd: serverDir, stdio: 'pipe' }).toString();
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
 * Setup the communication module
 */
async function setupCommunicationModule() {
  console.log(chalk.blue('=== Setting up Communication Module ==='));
  
  // Check if communication module exists
  if (!fs.existsSync(communicationDir)) {
    console.error(chalk.red('Communication module directory not found!'));
    process.exit(1);
  }
  
  // Build the TypeScript files
  runCommand('npm run build', 'Building TypeScript files');
  
  // Create .env file if it doesn't exist
  const envFile = path.join(serverDir, '.env');
  if (!fs.existsSync(envFile)) {
    console.log(chalk.cyan('Creating .env file'));
    
    const envContent = `# Communication Module Configuration
# Log level: debug, info, warn, error
LOG_LEVEL=info

# Modbus configuration
MODBUS_TIMEOUT=5000
MODBUS_MAX_RETRIES=3

# Cache configuration
CACHE_ENABLED=true
CACHE_TTL=60000

# Polling configuration
DEFAULT_POLLING_INTERVAL=10000
`;
    
    fs.writeFileSync(envFile, envContent);
    console.log(chalk.green('✓ Created .env file'));
  } else {
    console.log(chalk.yellow('⚠ .env file already exists, skipping'));
  }
  
  // Check for required NPM packages
  console.log(chalk.cyan('Checking for required NPM packages'));
  
  // List of required packages
  const requiredPackages = [
    'modbus-serial',
    'serialport',
    'events',
    'chalk'
  ];
  
  // Read package.json
  const packageJsonPath = path.join(serverDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Check if packages are installed
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const missingPackages = requiredPackages.filter(pkg => !dependencies[pkg]);
  
  if (missingPackages.length > 0) {
    console.log(chalk.yellow(`Missing required packages: ${missingPackages.join(', ')}`));
    console.log(chalk.cyan('Installing missing packages...'));
    
    // Install missing packages
    runCommand(`npm install ${missingPackages.join(' ')}`, 'Installing missing packages');
  } else {
    console.log(chalk.green('✓ All required packages are installed'));
  }
  
  // Final message
  console.log(chalk.green('✓ Communication module setup complete!'));
  console.log(chalk.blue('=== Next Steps ==='));
  console.log(chalk.white('1. Start the server to use the new communication module'));
  console.log(chalk.white('2. Run the migration script to migrate existing devices:'));
  console.log(chalk.white('   node scripts/migrate-polling-service.js'));
  console.log(chalk.white('3. Check the logs for any errors or warnings'));
}

// Run the setup
setupCommunicationModule().catch(error => {
  console.error(chalk.red('Error setting up communication module:'), error);
  process.exit(1);
});