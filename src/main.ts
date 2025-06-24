#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from 'zod';
import { toolRegistry } from './tools.js';

const server = new Server({
  name: "mcp-pushover",
  version: "1.0.0"
}, {
  capabilities: { 
    tools: {} 
  }
});

// Create tool lookup map
const toolsByName = new Map(toolRegistry.map(t => [t.name, t]));

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: toolRegistry.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = toolsByName.get(request.params.name);

  if (!tool) {
    throw new McpError(
      ErrorCode.MethodNotFound, 
      `Tool "${request.params.name}" not found`
    );
  }

  try {
    return await tool.handler(request.params.arguments);
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new McpError(
        ErrorCode.InvalidParams, 
        `Invalid parameters: ${messages}`
      );
    }
    
    console.error(`Tool execution error:`, error);
    throw new McpError(
      ErrorCode.InternalError, 
      `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});

// Start server
async function main() {
  console.error('MCP Pushover Bridge starting...');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Server stopped.');
}

main().catch(error => {
  console.error('Critical server failure:', error);
  process.exit(1);
});