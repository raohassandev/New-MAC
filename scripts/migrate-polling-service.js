/**
 * Polling Service Migration Script
 * 
 * This script helps migrate devices from the old polling service to the new communication module.
 * It reads all active devices from the database and initializes them in the new module.
 */

// Import required modules
require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const chalk = require('chalk');

// Import models
const { getClientModels } = require('../server/dist/config/database');

// Import the new module (will require build first)
const { initCommunicationModule } = require('../server/dist/communication');
const { 
  initializeDevice, 
  startPollingDeviceWithNewModule 
} = require('../server/dist/client/services/pollingServiceAdapter');

/**
 * Main migration function
 */
async function migratePollingService() {
  try {
    console.log(chalk.blue('=== Starting Polling Service Migration ==='));
    
    // Initialize the communication module
    console.log(chalk.cyan('Initializing communication module...'));
    const { deviceManager, pollingService, logService } = await initCommunicationModule({
      logLevel: 'info',
      enableCaching: true,
      cacheTTL: 60000 // 1 minute cache TTL
    });
    
    // Get client models
    console.log(chalk.cyan('Connecting to database...'));
    const clientModels = getClientModels();
    
    if (!clientModels || !clientModels.Device) {
      throw new Error('Client Device model not available');
    }
    
    // Find all enabled devices
    console.log(chalk.cyan('Finding enabled devices...'));
    const devices = await clientModels.Device.find({ enabled: true }).exec();
    
    console.log(chalk.green(`Found ${devices.length} enabled devices to migrate`));
    
    // Initialize each device in the new module
    for (const device of devices) {
      try {
        console.log(chalk.cyan(`Migrating device: ${device.name} (${device._id})`));
        
        // Initialize the device
        const deviceId = await initializeDevice(device._id.toString());
        
        if (!deviceId) {
          console.log(chalk.yellow(`⚠ Failed to initialize device ${device.name}`));
          continue;
        }
        
        // Determine polling interval
        let pollingInterval = 10000; // Default: 10 seconds
        
        if (device.pollingInterval) {
          pollingInterval = device.pollingInterval;
        }
        
        // Start polling with new module
        const success = await startPollingDeviceWithNewModule(deviceId, pollingInterval);
        
        if (success) {
          console.log(chalk.green(`✓ Successfully migrated device ${device.name}`));
        } else {
          console.log(chalk.yellow(`⚠ Failed to start polling for device ${device.name}`));
        }
      } catch (deviceError) {
        console.error(chalk.red(`❌ Error migrating device ${device.name}: ${deviceError.message}`));
      }
    }
    
    console.log(chalk.green('✓ Migration completed'));
    console.log(chalk.blue('=== Summary ==='));
    console.log(chalk.cyan(`Total devices: ${devices.length}`));
    console.log(chalk.cyan(`Active devices in new module: ${deviceManager.getDeviceIds().length}`));
    console.log(chalk.cyan(`Polling devices: ${pollingService.getActivePollingIds().length}`));
    
    // Keep the process running for a while to let polling initialize
    console.log(chalk.blue('Waiting 10 seconds to observe polling...'));
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log(chalk.green('Migration complete. You can now use the new communication module.'));
    
    // Exit the process
    process.exit(0);
  } catch (error) {
    console.error(chalk.red(`❌ Migration failed: ${error.message}`));
    process.exit(1);
  }
}

// Run the migration
migratePollingService();