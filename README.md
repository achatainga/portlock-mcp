# PortLock MCP

> Ephemeral Socket Broker & Zombie Process Terminator (EADDRINUSE Eliminator) for AI Coding Agents.

[![MCP 2026-07-28](https://img.shields.io/badge/MCP-2026--07--28-blue.svg)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## The Problem
When autonomous agents run dev servers (`vite`, `next dev`, `uvicorn`, `flask`):
1. **Zombie Sockets**: Orphaned node/python background processes hold ports 3000, 5173, or 8080 after a crashed or cancelled run.
2. **EADDRINUSE Panic**: Subsequent attempts crash with `Error: listen EADDRINUSE: address already in use :::3000`. The agent hallucinates configuration bugs instead of releasing the port.
3. **Multi-Agent Collision**: Multiple agent worktrees collide attempting to bind identical default ports.

## The Solution
PortLock MCP manages TCP socket allocation and eliminates zombie listener collisions:
- **Ephemeral Port Broker**: Dynamically identifies open sockets in non-colliding ranges (`40100-40999`).
- **Collision Detector**: Probes target ports to detect occupancy and identify the holding PID.
- **Zombie Terminator**: Kills orphaned processes cleanly to release held ports.
- **PreToolUse Rewriter**: Injects allocated dynamic ports directly into dev server startup commands (`--port $PORT`).

## Available MCP Tools

### `allocate_ephemeral_port`
Probes and guarantees an open TCP port for dev server processes.

### `audit_port_collision`
Checks whether a specific port is in use and identifies potential conflicts.

### `reclaim_zombie_socket`
Force-terminates zombie listener processes holding target ports.

## Live Verification
```bash
node tests/run_live_test.mjs
```

## License
MIT © 2026 PortLock Systems
