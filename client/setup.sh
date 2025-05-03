#!/bin/bash

# MacSys Setup Script

echo "Setting up MacSys (Modbus Device Management System)..."

# Install root dependencies
echo "Installing backend dependencies..."
npm install

# Navigate to client directory
cd client

# Install client dependencies
echo "Installing frontend dependencies..."
npm install

# Go back to the root directory
cd ..

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating default .env file..."
    echo "PORT=3333" > .env
    echo "MONGO_URI=mongodb://localhost:27017/macsys" >> .env
fi

echo "Setup complete!"
echo "You can now start the application with 'npm start'"