#!/bin/bash

# Start Redis server for development
echo "Starting Redis server..."

# Check if Redis is already running
if pgrep -x "redis-server" > /dev/null; then
    echo "Redis is already running"
else
    # Try to start Redis using different methods
    if command -v redis-server &> /dev/null; then
        echo "Starting Redis server..."
        redis-server --daemonize yes
        echo "Redis server started"
    elif command -v brew &> /dev/null; then
        echo "Installing Redis via Homebrew..."
        brew install redis
        brew services start redis
        echo "Redis server started via Homebrew"
    else
        echo "Redis not found. Please install Redis manually:"
        echo "  - macOS: brew install redis"
        echo "  - Ubuntu: sudo apt-get install redis-server"
        echo "  - Or download from: https://redis.io/download"
    fi
fi

# Test Redis connection
if redis-cli ping &> /dev/null; then
    echo "Redis is running and responding"
else
    echo "Warning: Redis is not responding. The app will work without caching."
fi
