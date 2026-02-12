#!/bin/bash
set -e

echo "--- Starting Document Processing Worker ---"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Load .env if it exists (for local dev)
if [ -f ".env" ]; then
    echo "Loading .env file..."
    export $(cat .env | xargs)
fi

# Run the worker
echo "Starting worker process..."
npm run worker
