# MCP-Pushover Bridge Detailed Implementation Plan

## Overview

This document outlines a comprehensive implementation plan for an MCP-over-stdio to Pushover bridge in Node.js/TypeScript. The plan builds upon the basic specification with production-ready patterns and best practices.

## Architecture Overview

### Core Components

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   STDIN     │────▶│  MCP Parser │────▶│   Router    │────▶│  Handlers   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                                         │
                           ▼                                         ▼
                    ┌─────────────┐                         ┌─────────────┐
                    │   STDOUT    │                         │  Pushover   │
                    └─────────────┘                         │     API     │
                                                            └─────────────┘
```

### Directory Structure

```
.
├── src/
│   ├── app.ts                 # Composition root: instantiates and wires everything
│   ├── index.ts               # Process entry point, handles graceful shutdown
│   ├── config.ts              # Configuration loader (convict)
│   ├── logger.ts              # Logger setup (pino)
│   ├── server.ts              # Manages the process, stdin/stdout, and handshake FSM
│   │
│   ├── mcp/
│   │   ├── mcp-parser.ts      # Stream parser class
│   │   ├── mcp.types.ts       # Core MCP interfaces
│   │   └── errors.ts          # Custom error classes
│   │
│   ├── commands/
│   │   ├── command.interface.ts
│   │   ├── router.ts
│   │   └── handlers/
│   │       └── push-send.handler.ts
│   │
│   ├── services/
│   │   └── pushover.ts        # Pushover API client with retry logic
│
├── test/
│   ├── unit/
│   └── integration/
```

## 1. Error Handling Strategy

### Custom Error Classes

```typescript
// src/mcp/errors.ts
export class McpProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpProtocolError';
  }
}

export class McpParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpParseError';
  }
}

export class PushoverApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'PushoverApiError';
  }
}
```

### Error Handling Policies

- **Parse Errors**: Log and continue processing next message
- **Protocol Errors**: Send MCP error response, continue connection
- **API Errors**: Implement retry with exponential backoff
- **Fatal Errors**: Graceful shutdown with proper cleanup

### Global Error Handlers

```typescript
process.on('uncaughtException', (error) => {
  logger.error('UNCAUGHT EXCEPTION:', error);
  // Perform graceful shutdown
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED REJECTION:', reason);
});
```

## 2. MCP Parser Implementation

### State Machine Design

```typescript
enum ParserState {
  IDLE,
  AWAITING_MULTILINE_DATA,
}
```

### Message Parsing Logic

```typescript
// Regex patterns for parsing
const MCP_COMMAND_REGEX = /^#\$#(\S+)(?:\s+(_auth:\S+))?(?:\s+(.*))?$/;
const KEY_VALUE_REGEX = /(\w+):"((?:\\"|[^"])*)"/g;

function parseLine(line: string): McpMessage | null {
  const commandMatch = line.match(MCP_COMMAND_REGEX);
  if (!commandMatch) return null;

  const [, name, authKey, argsString] = commandMatch;
  
  const message: Partial<McpMessage> = {
    messageId: generateUniqueId(),
    name: name,
    data: {},
  };

  if (authKey) {
    message.key = authKey.split(':')[1];
  }

  // Parse key-value pairs
  if (argsString) {
    let match;
    while ((match = KEY_VALUE_REGEX.exec(argsString)) !== null) {
      const key = match[1];
      const value = match[2].replace(/\\"/g, '"');
      message.data![key] = value;
    }
  }

  return message as McpMessage;
}
```

### Buffer Management

- Append incoming chunks to internal buffer
- Process complete lines (ending with \n)
- Handle partial messages across chunks
- Support multiline message assembly

## 3. Handshake State Management

### States

```typescript
enum HandshakeState {
  INITIALIZING,        // Bridge starting up
  AWAITING_GREETING,   // Waiting for client's #$#mcp
  NEGOTIATING,         // Exchanging capabilities
  ACTIVE,              // Ready for commands
  SHUTTING_DOWN        // Graceful shutdown
}
```

### State Transitions

- `INITIALIZING` → `AWAITING_GREETING` (on start)
- `AWAITING_GREETING` → `NEGOTIATING` (on valid client greeting)
- `NEGOTIATING` → `ACTIVE` (on successful capability exchange)
- `ACTIVE` → `SHUTTING_DOWN` (on shutdown signal)

## 4. Logging Strategy

### Using Pino for Structured Logging

```typescript
import pino from 'pino';

const logger = pino({
  level: config.get('logLevel'),
  formatters: {
    level: (label) => ({ level: label }),
  },
});
```

### Log Levels

- **info**: State transitions, successful operations
- **debug**: Message content, API request/response details
- **warn**: Recoverable errors, retries
- **error**: Unrecoverable errors, failed operations

### Correlation IDs

Add unique ID to each message for tracing through the system:

```typescript
const correlationId = generateUniqueId();
logger.info({ correlationId, command: message.name }, 'Processing command');
```

## 5. Configuration Management

### Layered Configuration with Convict

```typescript
import convict from 'convict';

const config = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  logLevel: {
    doc: 'The log level to use.',
    format: String,
    default: 'info',
    env: 'LOG_LEVEL'
  },
  pushover: {
    userKey: {
      doc: 'Pushover User Key',
      format: String,
      default: '',
      env: 'PUSHOVER_USER_KEY',
      sensitive: true
    },
    apiToken: {
      doc: 'Pushover API Token',
      format: String,
      default: '',
      env: 'PUSHOVER_API_TOKEN',
      sensitive: true
    }
  },
  retry: {
    maxAttempts: {
      doc: 'Maximum retry attempts for API calls',
      format: Number,
      default: 3,
      env: 'RETRY_MAX_ATTEMPTS'
    },
    initialDelay: {
      doc: 'Initial retry delay in ms',
      format: Number,
      default: 1000,
      env: 'RETRY_INITIAL_DELAY'
    }
  }
});

config.validate({ allowed: 'strict' });
export default config;
```

## 6. Retry Logic Implementation

### Using async-retry

```typescript
import retry from 'async-retry';
import axios from 'axios';

async function sendToPushover(params: PushoverParams) {
  await retry(
    async (bail) => {
      try {
        const response = await axios.post(
          'https://api.pushover.net/1/messages.json',
          params
        );
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          // Don't retry client errors (4xx)
          if (error.response.status >= 400 && error.response.status < 500) {
            bail(new PushoverApiError(
              `Client error: ${error.response.status}`,
              error.response.status
            ));
            return;
          }
        }
        // Retry on 5xx or network errors
        throw error;
      }
    },
    {
      retries: config.get('retry.maxAttempts'),
      factor: 2,
      minTimeout: config.get('retry.initialDelay'),
      randomize: true, // Adds jitter
    }
  );
}
```

## 7. Testing Strategy

### Unit Tests

**MCP Parser Tests**:
- Single complete message
- Partial message across chunks
- Multiple messages in one chunk
- Multiline message handling
- Malformed data handling
- Authentication key extraction

**Router Tests**:
- Command routing to correct handler
- Unknown command handling
- Error propagation

**Pushover Service Tests**:
- Correct API request construction
- Retry logic on failures
- Error handling for different status codes

### Integration Tests

**Handshake Flow Tests**:
- Happy path: Complete handshake
- Early command rejection
- Invalid greeting handling
- Unsupported package negotiation
- Timeout scenarios
- Malformed negotiation messages
- Unexpected shutdown during handshake

**End-to-End Tests**:
- Full message flow from STDIN to Pushover API
- Error recovery scenarios
- Graceful shutdown

## 8. Command Handler Architecture

### Plugin-Style System

```typescript
// src/commands/command.interface.ts
export interface McpCommandHandler {
  readonly commandName: string;
  execute(message: McpMessage): Promise<void>;
}

// src/commands/handlers/push-send.handler.ts
export class PushSendHandler implements McpCommandHandler {
  readonly commandName = 'dns-com-yourorg-push-send';

  constructor(private pushoverService: PushoverService) {}

  async execute(message: McpMessage): Promise<void> {
    // Validate auth key
    if (!this.isValidAuthKey(message.key)) {
      throw new McpProtocolError('Invalid authentication key');
    }

    // Extract and validate parameters
    const { message: text, title } = message.data;
    if (!text) {
      throw new McpProtocolError('Missing required "message" parameter');
    }

    // Send to Pushover
    await this.pushoverService.send({ message: text, title });
  }
}
```

### Router Implementation

```typescript
export class McpRouter {
  private handlers: Map<string, McpCommandHandler> = new Map();

  constructor(handlers: McpCommandHandler[]) {
    for (const handler of handlers) {
      this.handlers.set(handler.commandName, handler);
    }
  }

  public async route(message: McpMessage): Promise<void> {
    const handler = this.handlers.get(message.name);
    if (!handler) {
      logger.warn(`No handler for command: ${message.name}`);
      return;
    }
    return handler.execute(message);
  }
}
```

## 9. Production Monitoring

### Metrics to Expose

**Counters**:
- `mcp_messages_processed_total{command="<name>", status="success|error"}`
- `pushover_api_requests_total{status="success|error"}`
- `mcp_handshakes_total{status="success|failed"}`

**Histograms**:
- `mcp_message_processing_duration_seconds{command="<name>"}`
- `pushover_api_request_duration_seconds`

**Gauges**:
- `mcp_connection_active` (1 when active, 0 otherwise)

### Health Check Endpoint

```typescript
// Optional HTTP server for /metrics and /health
app.get('/health', (req, res) => {
  res.json({
    status: handshakeState === HandshakeState.ACTIVE ? 'healthy' : 'unhealthy',
    uptime: process.uptime(),
    version: packageJson.version,
  });
});
```

## 10. Production Readiness

### Graceful Shutdown

```typescript
let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info(`Received ${signal}, starting graceful shutdown`);
  
  // Stop accepting new messages
  parser.pause();
  
  // Send shutdown message to client
  stdout.write('#$#mcp-shutdown\n');
  
  // Wait for in-flight messages to complete
  await Promise.race([
    waitForPendingMessages(),
    new Promise(resolve => setTimeout(resolve, 5000)) // 5s timeout
  ]);
  
  // Close connections
  await closeAllConnections();
  
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

### Security Considerations

- Input validation on all MCP message parameters
- Sensitive data (API keys) never logged
- Authentication key validation before processing commands
- Rate limiting consideration for future enhancement

### Resource Management

- Rely on Node.js stream backpressure
- No explicit queuing needed between parser and router
- Memory-efficient buffer management in parser
- Connection pooling for HTTP requests (built into axios/got)

## Implementation Phases

### Phase 1: Core Infrastructure
1. Set up project structure and TypeScript configuration
2. Implement configuration management
3. Set up logging infrastructure
4. Create error classes

### Phase 2: MCP Protocol
1. Implement MCP parser with buffer management
2. Create handshake state machine
3. Build message routing system
4. Add authentication validation

### Phase 3: Pushover Integration
1. Implement Pushover API client
2. Add retry logic with exponential backoff
3. Create push-send command handler
4. Wire up end-to-end flow

### Phase 4: Testing
1. Unit tests for all components
2. Integration tests for handshake flow
3. End-to-end tests with mocked Pushover API
4. Error scenario testing

### Phase 5: Production Readiness
1. Add metrics collection
2. Implement graceful shutdown
3. Create Docker image
4. Write deployment documentation
5. Performance testing and optimization

## Next Steps

1. Review and approve this implementation plan
2. Set up the project repository with initial structure
3. Begin Phase 1 implementation
4. Establish CI/CD pipeline early in the process