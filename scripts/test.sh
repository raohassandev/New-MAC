#!/bin/bash

# Test script for verifying the restructured project

echo "===== Testing MAC Project Structure ====="

# Test 1: Check directory structure
echo -e "\n[TEST 1] Checking directory structure"
if [ -d "./client" ] && [ -d "./server" ] && [ -d "./docs" ] && [ -d "./scripts" ]; then
    echo "✅ Directory structure is correct"
else
    echo "❌ Directory structure is incorrect"
    exit 1
fi

# Test 2: Check package.json files
echo -e "\n[TEST 2] Checking package.json files"
if [ -f "./package.json" ] && [ -f "./client/package.json" ] && [ -f "./server/package.json" ]; then
    echo "✅ Package.json files exist"
else
    echo "❌ Package.json files missing"
    exit 1
fi

# Test 3: Check server source files
echo -e "\n[TEST 3] Checking server source files"
if [ -f "./server/src/index.ts" ] && [ -f "./server/src/server.ts" ]; then
    echo "✅ Server source files exist"
else
    echo "❌ Server source files missing"
    exit 1
fi

# Test 4: Check environment files
echo -e "\n[TEST 4] Checking environment files"
if [ -f "./server/.env" ] && [ -f "./server/.env.example" ]; then
    echo "✅ Environment files exist"
else
    echo "❌ Environment files missing"
    exit 1
fi

# Test 5: Check README
echo -e "\n[TEST 5] Checking README"
if [ -f "./README.md" ]; then
    echo "✅ README.md exists"
else
    echo "❌ README.md missing"
    exit 1
fi

echo -e "\n===== All tests passed! ====="
echo "Project restructuring is complete and verified."
echo "To run the application:"
echo "1. npm run install:all (first time setup)"
echo "2. npm run dev (to run both client and server in development mode)"