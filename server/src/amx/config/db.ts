import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();


// Library database connection
export const connectAmxToDB = async (): Promise<mongoose.Connection> => {
  try {
    const libraryDBUri = process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/macsys_library';
    console.log('Connecting to library database...');
    
    // Create a separate connection for the library database
    const libraryConnection = await mongoose.createConnection(libraryDBUri);
    console.log('Library database connected successfully');
    return libraryConnection;
  } catch (error) {
    console.error('Error connecting to library database:', error);
    throw error;
  }
};

export default connectAmxToDB
