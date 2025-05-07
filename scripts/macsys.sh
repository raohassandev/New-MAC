#!/bin/bash

# MacSys - Modbus Device Management System Startup Script

# Ensure script is run with necessary permissions
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run with sudo or as root" 
   exit 1
fi

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Prerequisite checks
check_prerequisites() {
    echo -e "${YELLOW}Checking system prerequisites...${NC}"
    
    # Check Node.js
    if ! command_exists node; then
        echo -e "${RED}Node.js is not installed!${NC}"
        exit 1
    fi

    # Check npm
    if ! command_exists npm; then
        echo -e "${RED}npm is not installed!${NC}"
        exit 1
    fi

    # Check MongoDB
    if ! command_exists mongod; then
        echo -e "${YELLOW}MongoDB not found. Ensure it's installed or running separately.${NC}"
    fi
}

# Start MongoDB service
start_mongodb() {
    if command_exists mongod; then
        echo -e "${GREEN}Starting MongoDB...${NC}"
        sudo systemctl start mongod || true
    fi
}

# Install dependencies
install_dependencies() {
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
}

# Start the application (both backend and frontend)
start_app() {
    echo -e "${GREEN}Starting MacSys...${NC}"
    npm start
}

# Main execution
main() {
    clear
    echo -e "${GREEN}🚀 MacSys Startup Script ${NC}"
    
    check_prerequisites
    start_mongodb
    install_dependencies
    start_app
}

# Run the main function
main