#!/usr/bin/env node
import { PortLockEngine } from '../src/engine.mjs';

const engine = new PortLockEngine();
const command = process.argv[2];

if (command === 'audit') {
  const port = parseInt(process.argv[3] || '3000', 10);
  engine.auditPortCollision(port).then(res => console.log(JSON.stringify(res, null, 2)));
} else if (command === 'reclaim') {
  const port = parseInt(process.argv[3] || '3000', 10);
  console.log(JSON.stringify(engine.reclaimZombieSocket(port), null, 2));
} else {
  engine.allocateEphemeralPort().then(res => {
    console.log(JSON.stringify(res, null, 2));
  }).catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
