import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Main application database connection
export const connectClientToDB = async (): Promise<mongoose.Connection> => {
  try {
    const mainDBUri = process.env.MONGO_URI || 'mongodb://localhost:27017/client';
    console.log('Connecting to client database...');
    
    // Configure Mongoose
    mongoose.set('strictQuery', false);
    
    // Connect to the database
    await mongoose.connect(mainDBUri);
    console.log('Client database connected successfully');
    
    // Initialize model after connecting - but we don't need to import it dynamically here
    const DeviceModel = mongoose.models.Device || mongoose.model('Device');
    
    // Initialize schema indexes
    await initializeIndexes();
    
    return mongoose.connection;
  } catch (error) {
    console.error('Error connecting to client database:', error);
    throw error;
  }
};

// Initialize database indexes for better query performance
const initializeIndexes = async (): Promise<void> => {
  try {
    // Get the Device model - only do this after connection is established
    if (mongoose.connection.readyState !== 1) {
      console.warn('Database not connected, skipping index creation');
      return;
    }
    
    // Try to get or create the Device model
    let DeviceModel;
    try {
      DeviceModel = mongoose.model('Device');
    } catch (modelError) {
      console.warn('Device model not registered yet, skipping index creation');
      return;
    }
    
    // Create indexes
    try {
      await DeviceModel.collection.createIndex({ name: 1 }, { unique: true });
      await DeviceModel.collection.createIndex({ deviceDriverId: 1 });
      await DeviceModel.collection.createIndex({ usage: 1 });
      await DeviceModel.collection.createIndex({ tags: 1 });
      
      console.log('Database indexes created successfully');
    } catch (indexError) {
      console.error('Error creating specific index:', indexError);
      // Continue even if one index fails
    }
  } catch (error) {
    console.error('Error creating database indexes:', error);
    // Don't throw error here to allow application to start even if indexes fail
  }
};

export default connectClientToDB;