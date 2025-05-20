// Test script to verify polling works with the same model approach as device service
const { pollDevice } = require('../dist/client/services/polling.service');
const { initializeDatabases } = require('../dist/config/database');

async function testPollingModels() {
  try {
    console.log('Initializing databases...');
    const { clientConnection, amxConnection, clientModels, amxModels } = await initializeDatabases();
    
    // Create a mock request object that mimics what the server provides
    const req = {
      app: {
        locals: {
          mainDB: clientConnection,
          libraryDB: amxConnection,
          clientModels: clientModels,
          libraryModels: amxModels,
        }
      }
    };
    
    // Test with your device ID
    const deviceId = '682a26321759f3842de76c14';
    
    console.log('\nTesting device polling for ID:', deviceId);
    console.log('Request context includes:');
    console.log('- clientModels.RealtimeData:', !!req.app.locals.clientModels.RealtimeData);
    console.log('- clientModels.HistoricalData:', !!req.app.locals.clientModels.HistoricalData);
    console.log('- clientModels.Device:', !!req.app.locals.clientModels.Device);
    
    // Poll the device
    const result = await pollDevice(deviceId, req);
    
    if (result) {
      console.log('\nPolling completed successfully!');
      console.log('Device Name:', result.deviceName);
      console.log('Readings count:', result.readings.length);
      
      // Check if models are being used correctly
      console.log('\nModel usage check:');
      
      // Check realtime data using the same model approach
      if (req.app.locals.clientModels.RealtimeData) {
        const realtimeData = await req.app.locals.clientModels.RealtimeData.findOne({ deviceId }).lean();
        if (realtimeData) {
          console.log('✓ Realtime data was stored successfully');
          console.log(`  Last updated: ${realtimeData.lastUpdated}`);
          console.log(`  Readings count: ${realtimeData.readings.length}`);
        } else {
          console.log('✗ No realtime data found in database');
        }
      }
      
      // Check historical data
      if (req.app.locals.clientModels.HistoricalData) {
        const historyCount = await req.app.locals.clientModels.HistoricalData.countDocuments({ 
          deviceId,
          timestamp: { $gte: new Date(Date.now() - 60000) } // Last minute
        });
        console.log(`✓ Historical data records in last minute: ${historyCount}`);
      }
      
    } else {
      console.log('No result from polling');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Close connections
    setTimeout(() => {
      console.log('\nTest completed');
      process.exit(0);
    }, 2000);
  }
}

testPollingModels();