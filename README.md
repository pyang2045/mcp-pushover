# MCP-Pushover Bridge

A Model Context Protocol (MCP) server that enables AI assistants to send push notifications via Pushover.

## Features

- Send push notifications through Pushover API
- Configurable retry logic with exponential backoff
- Support for all Pushover message parameters (title, priority, sound)
- Environment-based configuration
- Full TypeScript support

## Installation

### Quick Start (Recommended)
```bash
npx mcp-pushover
```

### Global Installation
```bash
npm install -g mcp-pushover
mcp-pushover
```

### From Source
```bash
git clone https://github.com/pyang2045/mcp-pushover.git
cd mcp-pushover
npm install
npm run build
npm start
```

## Configuration

### Environment Variables

Create a `.env` file or set these environment variables:

```bash
# Required (unless provided as tool parameters)
PUSHOVER_DEFAULT_TOKEN=your_pushover_app_token
PUSHOVER_DEFAULT_USER=your_pushover_user_key

# Optional
NODE_ENV=production
LOG_LEVEL=info
RETRY_MAX_ATTEMPTS=3
RETRY_INITIAL_DELAY=1000
```

### Claude Desktop Integration

Add to your Claude configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pushover": {
      "command": "npx",
      "args": ["mcp-pushover"],
      "env": {
        "PUSHOVER_DEFAULT_TOKEN": "your_token",
        "PUSHOVER_DEFAULT_USER": "your_user"
      }
    }
  }
}
```

## Available Tools

### pushover_send_message

Send a notification via Pushover.

**Parameters:**
- `message` (required): The message content to send
- `user_key` (optional): Pushover user or group key (defaults to env var)
- `api_token` (optional): Pushover application API token (defaults to env var)
- `title` (optional): Message title
- `priority` (optional): Message priority (-2 to 2)
- `sound` (optional): Notification sound name

**Example:**
```json
{
  "message": "Hello from MCP!",
  "title": "Test Notification",
  "priority": 0
}
```

## Development

### Setup
```bash
npm install
npm run build
```

### Run in Development Mode
```bash
npm run dev
```

### Testing
```bash
npm test
```

### Manual Testing
```bash
# Build first
npm run build

# Run the test script
node test/manual-test.js
```

## Security

- API tokens are never logged
- Supports environment variables for credential management
- All Pushover API calls use HTTPS

## License

MIT