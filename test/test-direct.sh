#!/bin/bash

# Direct test script for MCP-Pushover

echo "=== Testing MCP-Pushover Server ==="

# Set credentials (replace with your actual values)
export PUSHOVER_DEFAULT_TOKEN="your_token_here"
export PUSHOVER_DEFAULT_USER="your_user_key_here"

# Test 1: List tools
echo -e "\n1. Testing tools/list..."
echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}' | node dist/main.js

# Test 2: Send a notification
echo -e "\n2. Testing pushover_send_message..."
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pushover_send_message","arguments":{"message":"Test from MCP-Pushover!","title":"MCP Test"}},"id":2}' | node dist/main.js

echo -e "\nTest complete!"