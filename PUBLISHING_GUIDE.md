# NPM Publishing Guide for MCP-Pushover

This guide walks you through publishing the MCP-Pushover package to npm.

## Prerequisites

1. **NPM Account**: Create one at https://www.npmjs.com/signup
2. **Verify Email**: Confirm your email address with npm
3. **2FA Setup** (Optional but recommended): Enable two-factor authentication

## Pre-Publishing Checklist

### 1. Choose Package Name

Check if your desired name is available:
```bash
npm view mcp-pushover  # Should return 404 if available
# OR try variations:
# npm view @yourname/mcp-pushover
# npm view mcp-pushover-bridge
```

### 2. Update package.json

Ensure these fields are correct:
- `name`: Your unique package name
- `version`: Start with "0.1.0" for initial release
- `description`: Clear description
- `author`: Your name and email
- `license`: "MIT" or your chosen license
- `repository`: Your GitHub URL
- `keywords`: Help people find your package
- `files`: What to include in the package

### 3. Create Required Files

**LICENSE** (MIT License):
```
MIT License

Copyright (c) 2024 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 4. Update README.md

Replace placeholder values:
- Change `@yourorg/mcp-pushover` to your actual package name
- Update GitHub URLs
- Remove any development-specific paths
- Add npm badge: `[![npm version](https://badge.fury.io/js/mcp-pushover.svg)](https://www.npmjs.com/package/mcp-pushover)`

### 5. Build and Test

```bash
# Clean build
npm run clean
npm run build

# Test the package locally
npm link
mcp-pushover  # Should run

# Test with npm pack (creates tarball)
npm pack
# Check the .tgz file contents
tar -tzf mcp-pushover-*.tgz
```

## Publishing Steps

### 1. Login to NPM

```bash
npm login
# Enter username, password, and 2FA code if enabled
```

### 2. Final Checks

```bash
# Verify you're logged in
npm whoami

# Check what will be published
npm publish --dry-run
```

### 3. Publish

For first-time publish:
```bash
npm publish
```

For scoped packages (@username/package):
```bash
npm publish --access public
```

### 4. Verify Publication

```bash
# Check it's live (may take a minute)
npm view mcp-pushover

# Visit npm page
open https://www.npmjs.com/package/mcp-pushover
```

## Post-Publishing

### 1. Update Documentation

Update README.md installation instructions:
```markdown
## Installation

```bash
# Global installation
npm install -g mcp-pushover

# Or use with npx (recommended)
npx mcp-pushover
```

### Claude Desktop Configuration
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
```

### 2. Create GitHub Release

```bash
git tag v0.1.0
git push origin v0.1.0
```

Then create release on GitHub with changelog.

### 3. Test Installation

On another machine or directory:
```bash
npx mcp-pushover
# Should download and run
```

## Version Updates

When making updates:

1. Update version in package.json:
   - Patch: 0.1.0 → 0.1.1 (bug fixes)
   - Minor: 0.1.0 → 0.2.0 (new features)
   - Major: 0.1.0 → 1.0.0 (breaking changes)

2. Build and test

3. Publish:
   ```bash
   npm publish
   ```

## Troubleshooting

### "Package name not available"
- Try scoped name: `@yourusername/mcp-pushover`
- Try variation: `mcp-pushover-bridge`

### "Not authenticated"
```bash
npm logout
npm login
```

### "Missing required fields"
Check package.json has all required fields

### "Files not included"
Check the `files` field in package.json

## Security Notes

1. **Never commit .env files** - Already in .gitignore
2. **Don't include test credentials** in examples
3. **Use npm 2FA** for account security
4. **Check dependencies** for vulnerabilities:
   ```bash
   npm audit
   ```

## Best Practices

1. **Semantic Versioning**: Follow semver.org
2. **Changelog**: Maintain CHANGELOG.md
3. **Testing**: Test with `npm pack` before publishing
4. **Documentation**: Keep README current
5. **Support**: Add issues URL to package.json

## Quick Command Reference

```bash
# Login
npm login

# Check package
npm publish --dry-run

# Publish
npm publish

# View published package
npm view mcp-pushover

# Unpublish (within 72 hours)
npm unpublish mcp-pushover@0.1.0
```