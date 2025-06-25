# MCP-Pushover Bridge

A Model Context Protocol (MCP) server that enables AI assistants to send push notifications via Pushover. Perfect for getting instant mobile alerts when Claude completes tasks, encounters errors, or when you want to send yourself messages through your AI assistant.

## Features

- 📱 Send push notifications through Pushover API
- 🔄 Configurable retry logic with exponential backoff
- 🎛️ Support for all Pushover message parameters (title, priority, sound)
- ⚙️ Environment-based configuration
- 🔷 Full TypeScript support
- 🤖 Built for Claude Desktop and MCP-compatible clients

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

## Pushover Setup

Before using this MCP server, you need to set up Pushover:

### 1. Create Pushover Account
1. Sign up at [pushover.net](https://pushover.net/)
2. Note your **User Key** from the dashboard

### 2. Download Pushover App
1. Install the Pushover app on your mobile device:
   - **iOS**: Download from [App Store](https://apps.apple.com/us/app/pushover-notifications/id506088175)
   - **Android**: Download from [Google Play](https://play.google.com/store/apps/details?id=net.superblock.pushover)
2. Log in with your Pushover account credentials

### 3. Create Application
1. Go to [pushover.net/apps/build](https://pushover.net/apps/build)
2. Create a new application (e.g., "MCP Bridge")
3. Note your **API Token/Key**

### 4. Test Your Setup
You can test your credentials using curl:
```bash
curl -s \
  --form-string "token=YOUR_API_TOKEN" \
  --form-string "user=YOUR_USER_KEY" \
  --form-string "message=Test from MCP-Pushover" \
  https://api.pushover.net/1/messages.json
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

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pushover": {
      "command": "npx",
      "args": ["mcp-pushover"],
      "env": {
        "PUSHOVER_DEFAULT_TOKEN": "your_app_api_token",
        "PUSHOVER_DEFAULT_USER": "your_user_key"
      }
    }
  }
}
```

After updating the configuration, restart Claude Desktop to load the MCP server.

## Available Tools

### pushover_send_message

Send a notification via Pushover to your mobile device.

**Parameters:**
- `message` (required): The message content to send
- `user_key` (optional): Pushover user or group key (defaults to env var)
- `api_token` (optional): Pushover application API token (defaults to env var)
- `title` (optional): Message title
- `priority` (optional): Message priority:
  - `-2`: No notification/alert
  - `-1`: Quiet notification
  - `0`: Normal priority (default)
  - `1`: High priority
  - `2`: Emergency priority (requires acknowledgment)
- `sound` (optional): Notification sound (pushover, bike, bugle, cashregister, classical, cosmic, falling, gamelan, incoming, intermission, magic, mechanical, pianobar, siren, spacealarm, tugboat, alien, climb, persistent, echo, updown, vibrate, none)

**Example:**
```json
{
  "message": "Task completed successfully!",
  "title": "Claude Notification",
  "priority": 1,
  "sound": "magic"
}
```

## Use Cases

### Personal Messaging
Ask Claude to send yourself reminders or messages:
- *"Send me a notification to call mom at 5 PM"*
- *"Remind me to check the server logs"* 
- *"Send a message saying the backup is complete"*

### Task Completion Alerts
Get notified when Claude finishes work:
- *"Let me know when you're done analyzing this data"*
- *"Send me a notification when the report is ready"*
- *"Alert me if you find any errors in the code"*

### Workflow Integration
Integrate with your daily routines:
- Morning briefings and daily summaries
- Build completion and deployment notifications
- Error monitoring and system alerts
- Meeting reminders and calendar notifications

### Emergency Notifications
High-priority alerts that require immediate attention:
- System failures or critical errors
- Security alerts or unusual activity
- Time-sensitive reminders
- Urgent task completions

Simply ask Claude: *"Send me a push notification that says 'Deploy completed successfully'"* and you'll receive it instantly on your mobile device!

## Security

- API tokens are never logged
- Supports environment variables for credential management
- All Pushover API calls use HTTPS

## License

MIT