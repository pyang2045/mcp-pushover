#!/usr/bin/env node
const { spawn } = require('child_process');

// Test script to manually test the MCP server
const server = spawn('node', ['dist/main.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Handle server output
server.stdout.on('data', (data) => {
  console.log('Server output:', data.toString());
});

// Send a test request after a short delay
setTimeout(() => {
  // List tools request
  const listToolsRequest = {
    jsonrpc: '2.0',
    method: 'tools/list',
    id: 1
  };
  
  console.log('Sending list tools request...');
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 1000);

// Exit after 5 seconds
setTimeout(() => {
  console.log('Test complete, exiting...');
  server.kill();
  process.exit(0);
}, 5000);