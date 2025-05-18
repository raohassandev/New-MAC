#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting automated build and test process...${NC}"
echo ""

# Function to check if command was successful
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 completed successfully${NC}"
    else
        echo -e "${RED}❌ $1 failed${NC}"
        exit 1
    fi
}

# Clean previous builds
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
rm -rf server/dist client/dist
check_status "Clean"
echo ""

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm run install:all
check_status "Dependencies installation"
echo ""

# Run linting
echo -e "${YELLOW}🔍 Running linters...${NC}"
npm run lint
check_status "Linting"
echo ""

# Check formatting
echo -e "${YELLOW}🎨 Checking code formatting...${NC}"
npm run format:check
check_status "Format check"
echo ""

# Build server
echo -e "${YELLOW}🔨 Building server...${NC}"
npm run build:server
check_status "Server build"
echo ""

# Build client
echo -e "${YELLOW}🔨 Building client...${NC}"
npm run build:client
check_status "Client build"
echo ""

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
npm test
check_status "Tests"
echo ""

echo -e "${GREEN}🎉 All builds and tests completed successfully!${NC}"
echo -e "${GREEN}The project is ready for deployment.${NC}"