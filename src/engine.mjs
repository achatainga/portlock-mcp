import net from 'node:net';
import { execSync } from 'node:child_process';

/**
 * PortLock Engine (Stateless MCP 2026-07-28 Spec)
 * Ephemeral Socket Broker & Zombie Process Terminator
 */

export class PortLockEngine {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Probes OS TCP stack to find and guarantee a non-colliding ephemeral port.
   */
  async allocateEphemeralPort(startPort = 40100, endPort = 40999) {
    for (let port = startPort; port <= endPort; port++) {
      const isAvailable = await new Promise((resolve) => {
        const server = net.createServer();
        server.unref();
        server.on('error', () => resolve(false));
        server.listen(port, '127.0.0.1', () => {
          server.close(() => resolve(true));
        });
      });

      if (isAvailable) {
        return {
          port,
          host: '127.0.0.1',
          status: 'ALLOCATED_FREE',
          safeCliArg: `--port ${port}`
        };
      }
    }

    throw new Error(`Exhausted ephemeral port range ${startPort}-${endPort}. No available sockets.`);
  }

  /**
   * Checks whether a specific port is currently bound and in use.
   */
  async auditPortCollision(port) {
    return await new Promise((resolve) => {
      const server = net.createServer();
      server.unref();

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve({
            port,
            isOccupied: true,
            status: 'OCCUPIED_EADDRINUSE',
            severity: 'CRITICAL',
            message: `Port ${port} is currently bound by another process. Starting a server on this port will fail with EADDRINUSE.`
          });
        } else {
          resolve({ port, isOccupied: false, status: 'ERROR', error: err.message });
        }
      });

      server.listen(port, '127.0.0.1', () => {
        server.close(() => {
          resolve({
            port,
            isOccupied: false,
            status: 'AVAILABLE'
          });
        });
      });
    });
  }

  /**
   * Reclaims an occupied port by terminating the owning zombie process.
   */
  async reclaimZombieSocket(port) {
    const audit = await this.auditPortCollision(port);
    if (!audit.isOccupied) {
      return {
        port,
        actionTaken: 'NONE_NEEDED',
        message: `Port ${port} is already free.`
      };
    }

    let killedPids = [];
    try {
      if (process.platform === 'win32') {
        // Query netstat for PID on Windows
        const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        const lines = output.trim().split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && !isNaN(Number(pid)) && Number(pid) > 0 && Number(pid) !== process.pid) {
            try {
              execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
              killedPids.push(Number(pid));
            } catch {}
          }
        }
      } else {
        // POSIX lsof
        const pids = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim().split('\n');
        for (const pid of pids) {
          if (pid && Number(pid) !== process.pid) {
            execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
            killedPids.push(Number(pid));
          }
        }
      }
    } catch {
      // Netstat or taskkill returned no results or was denied
    }

    return {
      port,
      actionTaken: killedPids.length > 0 ? 'TERMINATED_ZOMBIES' : 'NO_PROCESS_FOUND',
      killedPids,
      message: `Reclaimed port ${port}. Terminated ${killedPids.length} owning zombie processes.`
    };
  }
}

// Standalone CLI runner
if (process.argv[1]?.endsWith('engine.mjs')) {
  const engine = new PortLockEngine();
  engine.allocateEphemeralPort().then(res => console.log(JSON.stringify(res, null, 2)));
}
