---
name: portlock-mcp
description: Ephemeral Socket Broker & Zombie Process Terminator (EADDRINUSE Eliminator) for AI Coding Agents.
version: 1.0.0
tags:
  - sockets
  - port-management
  - eaddrinuse
  - zombie-processes
  - dev-server
  - networking
---

# PortLock: Ephemeral Socket Broker & Zombie Terminator

PortLock eliminates the infamous `EADDRINUSE` crash loop by brokering non-colliding ephemeral ports and cleanly terminating orphaned background processes holding dev server ports.

## The Problem

Autonomous coding agents frequently enter circular failure loops when launching dev servers (`next dev`, `vite`, `uvicorn`, `flask`):
1. **Orphaned Sockets**: An earlier command crashed or timed out, but the node/python process remains active in the background bound to port 3000 or 8080.
2. **EADDRINUSE Spiral**: The agent sees `Error: listen EADDRINUSE: address already in use :::3000`, panics, edits application code or package.json, and burns dozens of turns attempting to fix a phantom bug.
3. **Multi-Agent Collision**: Two parallel agent worktrees attempt to spin up dev servers on the exact same default port.

## Core Capabilities

1. **Guaranteed Free Port Allocation**:
   - Dynamically brokers open ports in non-standard ranges (e.g. 40100–40999) using OS-level ephemeral socket probing.
2. **Port Collision Auditor**:
   - Inspects target ports to identify whether they are occupied and discovers the PID and command of the holding process.
3. **Deterministic Zombie Reclaim**:
   - Terminates orphaned zombie listeners cleanly via OS-level task management (`SIGTERM` / `taskkill`) to liberate blocked ports.
4. **PreToolUse Dev Command Rewriter**:
   - Injects allocated free ports directly into dev server startup flags (`--port $PORT`).

## Available MCP Tools

- `allocate_ephemeral_port`: Finds and verifies an available non-colliding TCP port.
- `audit_port_collision`: Checks if a specific port is in use and identifies the holding PID.
- `reclaim_zombie_socket`: Force-terminates orphaned processes holding target ports.

## Hook Integration

PortLock registers a `PreToolUse` hook in `hooks/hooks.json` to inspect server launch commands and clear port conflicts before execution.
