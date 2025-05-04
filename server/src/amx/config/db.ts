import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// AMX library database connection
export const connectAmxToDB = async (): Promise<mongoose.Connection> => {
  try {
    const libraryDBUri = process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/amx';
    console.log('Connecting to AMX library database...');
    
    // Create a separate connection for the AMX library database
    const libraryConnection = await mongoose.createConnection(libraryDBUri);
    console.log('AMX library database connected successfully');
    return libraryConnection;
  } catch (error) {
    console.error('Error connecting to AMX library database:', error);
    throw error;
  }
};

export default connectAmxToDB
