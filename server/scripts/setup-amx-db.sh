#!/bin/bash

# Script to set up the AMX database
echo "Setting up AMX database..."

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "MongoDB is not running. Please start MongoDB first."
    exit 1
fi

# Install required dependencies if not already present
if ! npm list -g mongodb-tools > /dev/null 2>&1; then
    echo "Installing MongoDB tools..."
    npm install -g mongodb
fi

# Run the database reset script
echo "Running database reset script..."
node "$(dirname "$0")/reset-db.js"

echo "AMX database setup complete!"