import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Main application database connection
export const connectMainDB = async (): Promise<mongoose.Connection> => {
  try {
    const mainDBUri = process.env.MONGO_URI || 'mongodb://localhost:27017/macsys';
    console.log('Connecting to main database...');
    await mongoose.connect(mainDBUri);
    console.log('Main database connected successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('Error connecting to main database:', error);
    throw error;
  }
};

// Library database connection
export const createLibraryDBConnection = async (): Promise<mongoose.Connection> => {
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

export default {
  connectMainDB,
  createLibraryDBConnection
};