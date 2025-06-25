#!/usr/bin/env node
const { spawn } = require('child_process');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Start the MCP server
console.log('Starting MCP-Pushover server...');
const server = spawn('node', ['dist/main.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let requestId = 1;

// Handle server output
server.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  lines.forEach(line => {
    try {
      const response = JSON.parse(line);
      console.log('\nServer Response:', JSON.stringify(response, null, 2));
    } catch (e) {
      // Not JSON, just print it
      if (line.trim()) {
        console.log('Server:', line);
      }
    }
  });
});

// Helper function to send a request
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    method: method,
    params: params,
    id: requestId++
  };
  console.log('\nSending:', JSON.stringify(request, null, 2));
  server.stdin.write(JSON.stringify(request) + '\n');
}

// Test sequence
async function runTests() {
  console.log('\n=== MCP-Pushover Test Client ===\n');
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 1: List available tools
  console.log('Test 1: Listing available tools...');
  sendRequest('tools/list');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Send a test notification
  console.log('\nTest 2: Sending a test notification...');
  
  // Ask for message
  const message = await new Promise(resolve => {
    rl.question('Enter message to send (or press Enter for default): ', (answer) => {
      resolve(answer || 'Test notification from MCP-Pushover!');
    });
  });
  
  const title = await new Promise(resolve => {
    rl.question('Enter title (optional, press Enter to skip): ', (answer) => {
      resolve(answer || '');
    });
  });
  
  // Build parameters
  const toolParams = {
    name: 'pushover_send_message',
    arguments: {
      message: message
    }
  };
  
  if (title) {
    toolParams.arguments.title = title;
  }
  
  // If no env vars set, ask for credentials
  if (!process.env.PUSHOVER_DEFAULT_TOKEN) {
    toolParams.arguments.api_token = await new Promise(resolve => {
      rl.question('Enter Pushover API token: ', resolve);
    });
    toolParams.arguments.user_key = await new Promise(resolve => {
      rl.question('Enter Pushover user key: ', resolve);
    });
  }
  
  sendRequest('tools/call', toolParams);
  
  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Clean up
  console.log('\nTest complete. Shutting down...');
  rl.close();
  server.kill();
  process.exit(0);
}

// Handle errors
server.on('error', (error) => {
  console.error('Server error:', error);
  rl.close();
  process.exit(1);
});

// Run tests
runTests().catch(error => {
  console.error('Test error:', error);
  rl.close();
  server.kill();
  process.exit(1);
});