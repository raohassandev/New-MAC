/**
 * Script to update template parameter names from generic "Register XXXX" to meaningful names
 * 
 * This script will:
 * 1. Connect to the AMX database
 * 2. Find the template with ID 6821fdee2af1d1a3177c7f5c
 * 3. Update parameter names from "Register XXXX" to meaningful names
 * 4. Save the updated template
 */

const mongoose = require('mongoose');

// Define meaningful parameter names for common industrial registers
const PARAMETER_NAME_MAP = {
  2512: 'Temperature',
  2712: 'Humidity', 
  2912: 'Power',
  3112: 'Voltage',
  1512: 'Pressure',
  900: 'Control Enable',
  801: 'Schedule Enable', 
  700: 'Alarm Status'
};

async function updateParameterNames() {
  try {
    console.log('Connecting to AMX database...');
    await mongoose.connect('mongodb://127.0.0.1:27017/amx');
    console.log('Connected to AMX database');

    const db = mongoose.connection.db;
    const templatesCollection = db.collection('templates');
    
    // Find the template
    const templateId = new mongoose.Types.ObjectId('6821fdee2af1d1a3177c7f5c');
    const template = await templatesCollection.findOne({ _id: templateId });
    
    if (!template) {
      console.error('Template not found with ID:', templateId);
      return;
    }
    
    console.log('Found template:', template.name);
    console.log('Current dataPoints:', template.dataPoints?.length || 0);
    
    let updatesCount = 0;
    
    // Update parameter names in dataPoints
    if (template.dataPoints && Array.isArray(template.dataPoints)) {
      for (const dataPoint of template.dataPoints) {
        if (dataPoint.parser?.parameters && Array.isArray(dataPoint.parser.parameters)) {
          for (const param of dataPoint.parser.parameters) {
            const registerIndex = param.registerIndex;
            const currentName = param.name;
            
            // Check if current name is generic "Register XXXX" format
            if (currentName && currentName.startsWith('Register ')) {
              const registerNumber = parseInt(currentName.replace('Register ', ''));
              
              // Update with meaningful name if we have a mapping
              if (PARAMETER_NAME_MAP[registerNumber]) {
                console.log(`Updating parameter: "${currentName}" → "${PARAMETER_NAME_MAP[registerNumber]}"`);
                param.name = PARAMETER_NAME_MAP[registerNumber];
                updatesCount++;
              } else {
                console.log(`No mapping found for register ${registerNumber}, keeping: "${currentName}"`);
              }
            } else if (registerIndex && PARAMETER_NAME_MAP[registerIndex] && currentName !== PARAMETER_NAME_MAP[registerIndex]) {
              // Also check by registerIndex if name doesn't match pattern
              console.log(`Updating parameter by registerIndex ${registerIndex}: "${currentName}" → "${PARAMETER_NAME_MAP[registerIndex]}"`);
              param.name = PARAMETER_NAME_MAP[registerIndex];
              updatesCount++;
            }
          }
        }
      }
    }
    
    if (updatesCount > 0) {
      console.log(`Found ${updatesCount} parameters to update, saving template...`);
      
      // Update the template in the database
      const result = await templatesCollection.updateOne(
        { _id: templateId },
        { 
          $set: { 
            dataPoints: template.dataPoints,
            updatedAt: new Date()
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log('✅ Template updated successfully!');
        console.log(`Updated ${updatesCount} parameter names`);
      } else {
        console.log('⚠️ Template was not modified (no changes detected)');
      }
    } else {
      console.log('No parameter names needed updating');
    }
    
    // Show final parameter list
    console.log('\nFinal parameter names:');
    if (template.dataPoints && Array.isArray(template.dataPoints)) {
      for (const dataPoint of template.dataPoints) {
        if (dataPoint.parser?.parameters) {
          for (const param of dataPoint.parser.parameters) {
            console.log(`  - Register ${param.registerIndex}: "${param.name}"`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error updating parameter names:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

// Run the script
updateParameterNames().catch(console.error);