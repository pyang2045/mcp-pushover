#!/usr/bin/env node
const { spawn } = require('child_process');

// Start the MCP server
console.log('Starting MCP-Pushover server...');
const server = spawn('node', ['dist/main.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Capture server stderr
server.stderr.on('data', (data) => {
  console.error('[Server]', data.toString().trim());
});

// Handle server output
let responseBuffer = '';
server.stdout.on('data', (data) => {
  responseBuffer += data.toString();
  const lines = responseBuffer.split('\n');
  
  // Process complete lines
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (line) {
      try {
        const response = JSON.parse(line);
        console.log('\nServer Response:', JSON.stringify(response, null, 2));
        
        // If this is the final response, exit
        if (response.id === 2) {
          setTimeout(() => {
            console.log('\nTest complete!');
            server.kill();
            process.exit(0);
          }, 1000);
        }
      } catch (e) {
        console.log('Non-JSON response:', line);
      }
    }
  }
  
  // Keep the last incomplete line in the buffer
  responseBuffer = lines[lines.length - 1];
});

// Send requests after server starts
setTimeout(() => {
  // First, list tools
  console.log('\nStep 1: Listing tools...');
  const listRequest = {
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: 1
  };
  server.stdin.write(JSON.stringify(listRequest) + '\n');
  
  // Then send a notification
  setTimeout(() => {
    console.log('\nStep 2: Sending test notification...');
    const callRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'pushover_send_message',
        arguments: {
          message: 'Test notification from MCP-Pushover! If you receive this, the integration is working correctly.',
          title: 'MCP Test Success'
        }
      },
      id: 2
    };
    server.stdin.write(JSON.stringify(callRequest) + '\n');
  }, 1000);
}, 1000);

// Handle errors
server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Set a timeout
setTimeout(() => {
  console.error('\nTest timed out after 10 seconds');
  server.kill();
  process.exit(1);
}, 10000);