# MCP-Pushover Deployment Guide

## Deployment Options for End Users

### 1. NPM Package (Recommended)

**For Package Author:**
```json
// package.json
{
  "name": "@yourorg/mcp-pushover",
  "version": "1.0.0",
  "bin": {
    "mcp-pushover": "./dist/main.js"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=18.0.0"
  }
}
```

Add shebang to main.js:
```typescript
#!/usr/bin/env node
// src/main.ts (first line)
```

**For End Users:**
```bash
# Global installation
npm install -g @yourorg/mcp-pushover

# Run directly
mcp-pushover

# Or use with npx (no installation)
npx @yourorg/mcp-pushover
```

### 2. MCP Configuration File Integration

Most MCP clients (like Claude Desktop) use a configuration file to manage servers:

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)
// %APPDATA%/Claude/claude_desktop_config.json (Windows)
{
  "mcpServers": {
    "pushover": {
      "command": "npx",
      "args": ["@yourorg/mcp-pushover"],
      "env": {
        "PUSHOVER_DEFAULT_TOKEN": "your_app_token",
        "PUSHOVER_DEFAULT_USER": "your_user_key"
      }
    }
  }
}
```

### 3. Pre-built Binaries (Using pkg or nexe)

For users without Node.js installed:

**Build binaries:**
```bash
# Install pkg
npm install -g pkg

# Package for multiple platforms
pkg . --targets node18-linux-x64,node18-macos-x64,node18-win-x64 --output dist/mcp-pushover
```

**package.json configuration:**
```json
{
  "pkg": {
    "scripts": "dist/**/*.js",
    "assets": [
      "package.json"
    ],
    "targets": [
      "node18-linux-x64",
      "node18-macos-x64", 
      "node18-win-x64"
    ],
    "outputPath": "dist"
  }
}
```

**Distribution:**
- Upload binaries to GitHub Releases
- Users download and run directly:
  ```bash
  ./mcp-pushover-macos
  ```

### 4. GitHub Repository with Installation Script

**Create install.sh:**
```bash
#!/bin/bash
# install.sh

echo "Installing MCP-Pushover Bridge..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js is required. Please install Node.js 18 or higher."
    exit 1
fi

# Clone and install
git clone https://github.com/yourorg/mcp-pushover.git ~/.mcp-pushover
cd ~/.mcp-pushover
npm install
npm run build

# Create wrapper script
cat > /usr/local/bin/mcp-pushover << 'EOF'
#!/bin/bash
node ~/.mcp-pushover/dist/main.js "$@"
EOF

chmod +x /usr/local/bin/mcp-pushover

echo "Installation complete! Run 'mcp-pushover' to start."
```

**For users:**
```bash
curl -sSL https://raw.githubusercontent.com/yourorg/mcp-pushover/main/install.sh | bash
```

### 5. Homebrew Formula (macOS)

Create a Homebrew formula for easy macOS installation:

```ruby
# homebrew-mcp/Formula/mcp-pushover.rb
class McpPushover < Formula
  desc "MCP-to-Pushover bridge for AI assistants"
  homepage "https://github.com/yourorg/mcp-pushover"
  url "https://github.com/yourorg/mcp-pushover/archive/v1.0.0.tar.gz"
  sha256 "YOUR_SHA256_HERE"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", "--production"
    system "npm", "run", "build"
    libexec.install Dir["*"]
    bin.install_symlink libexec/"dist/main.js" => "mcp-pushover"
  end

  test do
    assert_match "mcp-pushover", shell_output("#{bin}/mcp-pushover --version")
  end
end
```

**For users:**
```bash
brew tap yourorg/mcp
brew install mcp-pushover
```

## Configuration Management for End Users

### 1. Environment Variables (Simple)
```bash
export PUSHOVER_DEFAULT_TOKEN="your_token"
export PUSHOVER_DEFAULT_USER="your_user"
mcp-pushover
```

### 2. Configuration File (User-Friendly)
```typescript
// Support ~/.config/mcp-pushover/config.json
import os from 'os';
import path from 'path';
import fs from 'fs';

const configPaths = [
  path.join(os.homedir(), '.config', 'mcp-pushover', 'config.json'),
  path.join(os.homedir(), '.mcp-pushover.json'),
];

function loadUserConfig() {
  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  }
  return {};
}
```

### 3. Interactive Setup (First Run)
```typescript
// Add to main.ts
async function firstTimeSetup() {
  console.log("Welcome to MCP-Pushover! Let's set up your configuration.");
  
  const token = await prompt("Enter your Pushover App Token: ");
  const user = await prompt("Enter your Pushover User Key: ");
  
  const config = { 
    pushover: { 
      default_token: token, 
      default_user: user 
    } 
  };
  
  const configPath = path.join(os.homedir(), '.mcp-pushover.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  console.log(`Configuration saved to ${configPath}`);
}
```

## Recommended Deployment Strategy

For the best user experience, I recommend:

1. **Publish to NPM** as the primary distribution method
2. **Provide MCP config examples** in the README
3. **Support both env vars and config files** for flexibility
4. **Include clear setup instructions** with examples

### Example README section:
```markdown
## Installation

### Quick Start (Recommended)
```bash
npx @yourorg/mcp-pushover
```

### Global Installation
```bash
npm install -g @yourorg/mcp-pushover
mcp-pushover
```

### Configure with Claude Desktop
Add to your Claude configuration:
```json
{
  "mcpServers": {
    "pushover": {
      "command": "npx",
      "args": ["@yourorg/mcp-pushover"],
      "env": {
        "PUSHOVER_DEFAULT_TOKEN": "your_token",
        "PUSHOVER_DEFAULT_USER": "your_user"
      }
    }
  }
}
```
```

## Security Considerations

1. **Never commit credentials** - Use environment variables or secure config files
2. **Validate permissions** - Ensure config files have appropriate permissions (600)
3. **Support credential helpers** - Allow reading from system keychains
4. **Provide token scoping** - Document minimum required Pushover permissions

This approach makes it easy for users to install and configure your MCP server while maintaining security and flexibility.