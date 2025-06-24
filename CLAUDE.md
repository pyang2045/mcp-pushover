# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP-over-stdio to Pushover bridge implementation in Node.js/TypeScript. The bridge acts as a server that communicates via STDIN/STDOUT using the MCP 2.1 protocol and sends push notifications through the Pushover API.

## Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Run in development mode with ts-node
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Type check
npm run typecheck
```

## Architecture

The system follows a modular architecture with these core components:

- **stream.ts**: Handles STDIN/STDOUT communication using `split2` for line parsing
- **mcp-parser.ts**: Stateful parser for MCP protocol messages, handles authentication and message assembly
- **pushover.ts**: HTTP client wrapper for Pushover API using `got`
- **router.ts**: Message routing logic, converts MCP messages to internal events
- **index.ts**: Main entry point, orchestrates handshake and event flow

### Protocol Flow

1. Server sends initial MCP version handshake
2. Client responds with authentication key
3. Both exchange capability negotiation messages
4. Normal message flow begins, with `#$#dns-com-yourorg-push-send` triggering push notifications

### Key Dependencies

- `typescript` & `ts-node`: Development and compilation
- `split2`: Line-based stream parsing
- `got`: HTTP client for Pushover API
- `dotenv`: Environment variable management

### Environment Configuration

Required environment variables in `.env`:
- `PUSHOVER_TOKEN`: Pushover application token
- `PUSHOVER_USER`: Pushover user key

### Testing Strategy

- Unit tests with Jest for parser and API mocking
- Integration tests using scripted MCP flows and HTTP request mocking with `nock`