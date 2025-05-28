/**
 * Script to check current parameter names in the template
 * This will help diagnose why register names are showing as "Register XXXX"
 */

const mongoose = require('mongoose');

async function checkTemplateParameters() {
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
      console.error('❌ Template not found with ID:', templateId);
      return;
    }
    
    console.log('✅ Found template:', template.name);
    console.log('📊 Template info:');
    console.log(`  - ID: ${template._id}`);
    console.log(`  - Name: ${template.name}`);
    console.log(`  - DataPoints: ${template.dataPoints?.length || 0}`);
    console.log('');
    
    // Check dataPoints structure
    if (template.dataPoints && Array.isArray(template.dataPoints)) {
      console.log('📋 DataPoints Analysis:');
      
      template.dataPoints.forEach((dataPoint, dpIndex) => {
        console.log(`\n  DataPoint ${dpIndex + 1}:`);
        console.log(`    - Range: ${dataPoint.range?.startAddress}-${dataPoint.range?.startAddress + dataPoint.range?.count - 1} (FC${dataPoint.range?.fc})`);
        console.log(`    - Parser: ${dataPoint.parser ? 'Yes' : 'No'}`);
        
        if (dataPoint.parser?.parameters && Array.isArray(dataPoint.parser.parameters)) {
          console.log(`    - Parameters: ${dataPoint.parser.parameters.length}`);
          
          dataPoint.parser.parameters.forEach((param, paramIndex) => {
            console.log(`      ${paramIndex + 1}. Name: "${param.name}"`);
            console.log(`         RegisterIndex: ${param.registerIndex}`);
            console.log(`         DataType: ${param.dataType}`);
            console.log(`         Unit: ${param.unit || 'none'}`);
            console.log(`         Description: ${param.description || 'none'}`);
            console.log('');
          });
        } else {
          console.log('    - Parameters: None');
        }
      });
    } else {
      console.log('❌ No dataPoints found in template');
    }
    
    // Also check for legacy registers
    if (template.registers && Array.isArray(template.registers)) {
      console.log('\n📋 Legacy Registers:');
      template.registers.forEach((register, index) => {
        console.log(`  ${index + 1}. Name: "${register.name}"`);
        console.log(`     Address: ${register.address}`);
        console.log(`     Unit: ${register.unit || 'none'}`);
        console.log('');
      });
    }
    
    // Show full template structure (limited)
    console.log('\n🔍 Full Template Structure (first 2000 chars):');
    const templateStr = JSON.stringify(template, null, 2);
    console.log(templateStr.substring(0, 2000));
    if (templateStr.length > 2000) {
      console.log('... (truncated)');
    }
    
  } catch (error) {
    console.error('Error checking template:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  }
}

// Run the script
checkTemplateParameters().catch(console.error);