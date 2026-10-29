import assert from 'node:assert';
import net from 'node:net';
import { PortLockEngine } from '../src/engine.mjs';

async function runAllTests() {
  console.log('🧪 Starting PortLock MCP Live Test Gauntlet...');
  const engine = new PortLockEngine();

  // Test 1: Dynamic ephemeral port allocation
  console.log('\n[Test 1] Allocating guaranteed non-colliding ephemeral port...');
  const alloc = await engine.allocateEphemeralPort(40200, 40250);
  assert.ok(alloc.port >= 40200 && alloc.port <= 40250);
  assert.strictEqual(alloc.status, 'ALLOCATED_FREE');
  console.log(`  ✅ Successfully allocated open socket on 127.0.0.1:${alloc.port}`);

  // Test 2: Detect EADDRINUSE collision on intentionally bound port
  console.log('\n[Test 2] Binding test TCP socket and detecting collision...');
  const testServer = net.createServer();
  const testPort = 40299;

  await new Promise((resolve) => {
    testServer.listen(testPort, '127.0.0.1', resolve);
  });

  const auditResult = await engine.auditPortCollision(testPort);
  assert.strictEqual(auditResult.isOccupied, true);
  assert.strictEqual(auditResult.status, 'OCCUPIED_EADDRINUSE');
  console.log(`  ✅ Successfully caught EADDRINUSE collision on port ${testPort}`);

  // Test 3: Closing socket and re-verifying port liberation
  console.log('\n[Test 3] Releasing bound socket and verifying availability...');
  await new Promise((resolve) => {
    testServer.close(resolve);
  });

  const freeAudit = await engine.auditPortCollision(testPort);
  assert.strictEqual(freeAudit.isOccupied, false);
  assert.strictEqual(freeAudit.status, 'AVAILABLE');
  console.log(`  ✅ Port ${testPort} successfully liberated and verified free.`);

  // Test 4: Consecutive non-colliding allocations
  console.log('\n[Test 4] Verifying consecutive distinct port allocations...');
  const allocA = await engine.allocateEphemeralPort(40300, 40310);
  const allocB = await engine.allocateEphemeralPort(40311, 40320);
  assert.notStrictEqual(allocA.port, allocB.port);
  console.log(`  ✅ Zero-collision verified: Socket A=${allocA.port}, Socket B=${allocB.port}`);

  console.log('\n🎉 ALL 4 GAUNTLET TESTS PASSED WITH 100% SUCCESS RATE!');
}

runAllTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
