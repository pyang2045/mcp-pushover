# MCP‑over‑stdio to Pushover Bridge (Node.js)

## 1. High‑level specification

| Aspect | Details |
| --- | --- |
| **Transport** | **STDIN/STDOUT** text stream. Every line beginning `#$#` is treated as an MCP out‑of‑band message, everything else is in‑band text. |
| **Protocol supported** | **MCP 2.1** (`mcp`, `mcp-negotiate`, optional `mcp-cord`). Start‑up handshake: ① server sends `#$#mcp version:2.1 to:2.1` → ② client replies `#$#mcp authentication-key:<key> version:2.1 to:2.1` → ③ both exchange `mcp-negotiate-can`, then normal traffic. |
| **Custom package** | `dns-com-yourorg-push 1.0`<br>`#$#dns-com-yourorg-push-send <key> message:"text" title:"optional"` triggers a Pushover push. |
| **Notification backend** | HTTPS POST to `https://api.pushover.net/1/messages.json` with `token`, `user`, `message`, plus optional `title`, `priority`, etc. |
| **Security** | • Authentication‑key from MCP used to gate messages.<br>• Pushover APP_TOKEN and USER_KEY kept in env vars.<br>• TLS enforced by Pushover. |
| **Failure handling** | Non‑1 status codes or HTTP ≥ 500 → back‑off 5 s and retry once (per Pushover best practice). |

## 2. Implementation plan (Node.js + TypeScript)

1. **Project scaffolding**

   ```bash
   mkdir mcp-pushover && cd $_
   npm init -y
   npm i typescript ts-node @types/node got split2 dotenv
   npx tsc --init
   ```

2. **Core modules**

   | File | Responsibility |
   | ---- | -------------- |
   | `stream.ts` | Reads `process.stdin`, writes `process.stdout`, using `split2` to emit complete lines. |
   | `mcp-parser.ts` | Stateful parser that classifies lines, validates auth-key, assembles multiline values, emits `{name, args}` objects. |
   | `pushover.ts` | Thin wrapper around **got**; `send({message,title,priority})` returns JSON response. |
   | `router.ts` | Converts `{name,args}` → internal events; on `dns-com-yourorg-push-send` calls `pushover.send`. |
   | `index.ts` | Wire-up: load `.env`, generate/authenticate key, perform handshake, start pumps. |

3. **Handshake logic**

   After stdin stream opens:

   ```ts
   stdout.write('#$#mcp version: 2.1 to: 2.1\n');
   ```

   Then wait for client’s `mcp` reply, store `authKey`, send:

   ```ts
   stdout.write(`#$#mcp-negotiate-can ${authKey} package: dns-com-yourorg-push min-version: 1.0 max-version: 1.0\n`);
   stdout.write(`#$#mcp-negotiate-end ${authKey}\n`);
   ```

4. **Message routing**

   *Single‑line send*

   ```text
   #$#dns-com-yourorg-push-send <key> message:"Hello" title:"Optional Title"
   ```

   becomes

   ```ts
   pushover.send({ message: args.message, title: args.title });
   ```

5. **Testing**

   *Unit:* Jest for parser and Pushover stub.  
   *Integration:* Run server, pipe scripted MCP lines, expect HTTP requests via nock.

6. **Lint/CI**

   ESLint + GitHub Actions matrix (Node 18/20).

## 3. Deployment & running guide

| Step | Command / File |
| ---- | -------------- |
| **Build** | `npm run build` (tsc → `dist/`) |
| **Local run** | `.env` with `PUSHOVER_TOKEN`, `PUSHOVER_USER` → `node dist/index.js` |
| **Docker (optional)** | **Dockerfile** |
| | ```dockerfile
| FROM node:20-alpine  
| WORKDIR /app  
| COPY . .  
| RUN npm ci && npm run build  
| CMD ["node","dist/index.js"]
| ``` |
| **Systemd service** | `/etc/systemd/system/mcp-pushover.service` |
| | ```ini
| [Service]
| ExecStart=/usr/bin/node /opt/mcp-pushover/dist/index.js
| EnvironmentFile=/opt/mcp-pushover/.env
| Restart=on-failure
| 
| [Install]
| WantedBy=multi-user.target
| ``` |
| **Logs** | `journalctl -u mcp-pushover -f` |
| **Scaling** | Stateless; run multiple containers behind a TCP multiplexer if needed. |

## 4. Next enhancements

* Add **mcp-cord** support to multiplex multiple logical channels.  
* Provide a **/healthz** HTTP endpoint (Express) for container orchestrators.  
* Implement receipt polling for Pushover emergency messages (priority 2).