import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Main application database connection
export const connectClientToDB = async (): Promise<mongoose.Connection> => {
  try {
    const mainDBUri = process.env.MONGO_URI || 'mongodb://localhost:27017/client';
    console.log('Connecting to client database...');
    await mongoose.connect(mainDBUri);
    console.log('Client database connected successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('Error connecting to client database:', error);
    throw error;
  }
};

export default connectClientToDB