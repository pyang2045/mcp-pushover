# MCP-Pushover Bridge Implementation Plan (SDK-Based)

## Overview

This document outlines the implementation plan for the MCP-Pushover bridge using the official `@modelcontextprotocol/sdk` TypeScript package. This approach leverages the SDK's built-in protocol handling, significantly reducing implementation complexity while maintaining flexibility.

## Key Decision: Using the Official SDK

After researching the `@modelcontextprotocol/sdk`, we've decided to use it instead of implementing the protocol from scratch. Benefits include:

- **Reduced complexity**: No need to implement protocol parsing, handshake logic, or state management
- **Battle-tested implementation**: The SDK handles edge cases and protocol compliance
- **Automatic protocol updates**: Future MCP versions will be supported via SDK updates
- **Focus on business logic**: We can concentrate on the Pushover integration

## Architecture Overview

### SDK-Based Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│ MCP Client  │────▶│ StdioTransport  │────▶│  MCP Server  │
└─────────────┘     └─────────────────┘     └──────────────┘
                                                     │
                                                     ▼
                                            ┌──────────────┐
                                            │ Tool Handler │
                                            └──────────────┘
                                                     │
                                                     ▼
                                            ┌──────────────┐
                                            │ Pushover API │
                                            └──────────────┘
```

### Directory Structure

```
.
├── src/
│   ├── main.ts                # Server setup and request handlers
│   ├── tools.ts               # Tool definitions and registry
│   ├── services/
│   │   └── pushover.ts        # Pushover API client
│   └── types/
│       └── index.ts           # TypeScript type definitions
├── test/
│   ├── tools.test.ts          # Tool handler tests
│   └── integration.test.ts    # End-to-end tests
├── package.json
├── tsconfig.json
└── .env.example
```

## Implementation Details

### 1. Tool Definition Pattern

We'll use a clean pattern combining Zod for validation with the SDK's requirements:

```typescript
// src/tools.ts
import { z } from 'zod';

// Define input schema with Zod
const pushoverSendInputSchema = z.object({
  message: z.string().describe("The message content to send"),
  user_key: z.string().describe("Pushover user or group key"),
  api_token: z.string().describe("Pushover application API token"),
  title: z.string().optional().describe("Optional message title"),
  priority: z.number().min(-2).max(2).optional().describe("Message priority"),
  sound: z.string().optional().describe("Notification sound"),
});

// Tool definition
export const pushoverTool = {
  name: 'pushover.send_message',
  description: 'Send a notification via Pushover',
  inputSchema: z.toJSONSchema(pushoverSendInputSchema),
  handler: async (args: unknown) => {
    const validated = pushoverSendInputSchema.parse(args);
    const result = await sendPushoverMessage(validated);
    return {
      content: [{
        type: "text",
        text: result.success 
          ? `Message sent successfully (request: ${result.request})`
          : `Failed to send message: ${result.error}`
      }]
    };
  }
};

// Tool registry
export const toolRegistry = [pushoverTool];
```

### 2. Server Implementation

Using the SDK's Server class with request handlers:

```typescript
// src/main.ts
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
  name: "pushover-bridge",
  version: "1.0.0"
}, {
  capabilities: { tools: {} }
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
      ErrorCode.ToolNotFound, 
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
        ErrorCode.InvalidParameters, 
        `Invalid parameters: ${messages}`
      );
    }
    
    console.error(`Tool execution error:`, error);
    throw new McpError(
      ErrorCode.InternalError, 
      `Tool execution failed`
    );
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

### 3. Pushover Service

Clean service implementation with retry logic:

```typescript
// src/services/pushover.ts
import axios from 'axios';
import pRetry from 'p-retry';

interface PushoverMessage {
  token: string;
  user: string;
  message: string;
  title?: string;
  priority?: number;
  sound?: string;
  timestamp?: number;
}

interface PushoverResponse {
  status: number;
  request: string;
  errors?: string[];
}

export class PushoverService {
  private readonly apiUrl = 'https://api.pushover.net/1/messages.json';

  async send(params: PushoverMessage): Promise<PushoverResponse> {
    return pRetry(
      async () => {
        const response = await axios.post<PushoverResponse>(
          this.apiUrl,
          params,
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 10000,
          }
        );

        if (response.data.status !== 1) {
          throw new Error(`Pushover API error: ${response.data.errors?.join(', ')}`);
        }

        return response.data;
      },
      {
        retries: 3,
        onFailedAttempt: (error) => {
          console.error(`Pushover attempt ${error.attemptNumber} failed:`, error.message);
        },
        retryCondition: (error) => {
          // Only retry on network errors or 5xx responses
          if (axios.isAxiosError(error)) {
            return !error.response || error.response.status >= 500;
          }
          return false;
        },
      }
    );
  }
}
```

### 4. Configuration Management

Using environment variables with validation:

```typescript
// src/config.ts
import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  PUSHOVER_DEFAULT_TOKEN: z.string().optional(),
  PUSHOVER_DEFAULT_USER: z.string().optional(),
  RETRY_MAX_ATTEMPTS: z.coerce.number().min(1).default(3),
  RETRY_INITIAL_DELAY: z.coerce.number().min(100).default(1000),
});

export const config = configSchema.parse(process.env);
```

### 5. Error Handling

Comprehensive error handling with custom error classes:

```typescript
// src/errors.ts
export class PushoverError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly errors?: string[]
  ) {
    super(message);
    this.name = 'PushoverError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
```

### 6. Testing Strategy

#### Unit Tests

```typescript
// test/tools.test.ts
import { describe, it, expect, vi } from 'vitest';
import { pushoverTool } from '../src/tools';

describe('Pushover Tool', () => {
  it('should validate input parameters', async () => {
    await expect(
      pushoverTool.handler({ message: 123 }) // Invalid type
    ).rejects.toThrow('Expected string');
  });

  it('should format successful response', async () => {
    vi.mock('../src/services/pushover', () => ({
      sendPushoverMessage: async () => ({ 
        success: true, 
        request: 'test-123' 
      })
    }));

    const result = await pushoverTool.handler({
      message: 'Test',
      user_key: 'user123',
      api_token: 'token123'
    });

    expect(result.content[0].text).toContain('successfully');
  });
});
```

#### Integration Tests

```typescript
// test/integration.test.ts
import { spawn } from 'child_process';
import { describe, it, expect } from 'vitest';

describe('MCP Server Integration', () => {
  it('should handle complete tool flow', async () => {
    const server = spawn('node', ['dist/main.js']);
    
    // Send list tools request
    server.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: 1
    }) + '\n');

    // Verify response contains our tool
    const response = await readLine(server.stdout);
    expect(response).toContain('pushover.send_message');
  });
});
```

## Implementation Phases

### Phase 1: Core Setup (Week 1)
- [x] Research and validate SDK approach
- [ ] Set up project with TypeScript and dependencies
- [ ] Implement basic tool structure
- [ ] Create minimal Pushover service

### Phase 2: Full Implementation (Week 2)
- [ ] Complete Pushover service with retry logic
- [ ] Add comprehensive error handling
- [ ] Implement configuration management
- [ ] Add logging with structured format

### Phase 3: Testing & Polish (Week 3)
- [ ] Write comprehensive unit tests
- [ ] Create integration test suite
- [ ] Add API documentation
- [ ] Performance optimization

### Phase 4: Production Ready (Week 4)
- [ ] Docker containerization
- [ ] CI/CD pipeline setup
- [ ] Deployment documentation
- [ ] Monitoring and metrics

## Key Differences from Original Plan

1. **No custom protocol implementation**: The SDK handles all MCP protocol details
2. **Simplified architecture**: No need for parser, handshake manager, or state machines
3. **Tool-centric design**: Focus on defining tools rather than protocol handling
4. **Native TypeScript patterns**: Using Zod for validation and type safety
5. **Reduced testing scope**: No need to test protocol compliance

## Development Guidelines

1. **Type Safety**: Use TypeScript strictly with no `any` types
2. **Validation**: Always validate inputs with Zod schemas
3. **Error Messages**: Provide clear, actionable error messages
4. **Logging**: Use structured logging for production debugging
5. **Testing**: Maintain >80% code coverage

## Next Steps

1. Create a minimal PoC to validate the SDK approach
2. Test with a real MCP client to ensure compatibility
3. Iterate based on findings
4. Begin full implementation following this plan