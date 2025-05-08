#!/bin/bash

# Set NODE_ENV to development for proper debugging
export NODE_ENV=development

# Ensure logs directory exists
mkdir -p logs/modbus logs/api logs/system

# Check if Node.js and npm are installed
if ! command -v node > /dev/null 2>&1; then
  echo "Error: Node.js is not installed. Please install Node.js version 18 or higher."
  exit 1
fi

# Check for required dependencies
echo "Checking dependencies..."
npm install express-rate-limit morgan winston --no-save

# Start server with extra output
echo "Starting server with monitoring and debugging enabled..."
echo "You can access the monitoring dashboard at: http://localhost:3333/monitoring"
echo "---------------------------------------"

# Start the server with debugging
node --inspect scripts/start-with-monitoring.js