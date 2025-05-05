import mongoose from 'mongoose';
import dotenv from 'dotenv';
import '../models/Device'; // Import the Device model to ensure it's registered

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
    // Get the Device model
    const Device = mongoose.model('Device');
    
    // Create indexes
    await Device.collection.createIndex({ name: 1 }, { unique: true });
    await Device.collection.createIndex({ deviceDriverId: 1 });
    await Device.collection.createIndex({ usage: 1 });
    await Device.collection.createIndex({ tags: 1 });
    
    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating database indexes:', error);
    // Don't throw error here to allow application to start even if indexes fail
  }
};

export default connectClientToDB;