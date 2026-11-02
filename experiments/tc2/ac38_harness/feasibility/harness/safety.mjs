// ==========================================================
// AC38 limited feasibility study — process safety checks and the result line (shared by both fixtures)
// ==========================================================
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

export const refuse = (m) => { throw new Error(`AC38 REFUSED: ${m}`); };

export function emit(payload, code) {
  process.stdout.write(`\n@@AC38@@${JSON.stringify(payload)}@@END@@\n`, () => process.exit(code));
}

// Runs before any application or synthetic module loads.  The guard marker is checked before the
// socket attempt, so a process without the guard never opens a connection.
export function safetyChecks(denyProbe) {
  const p = process.permission;
  if (!p || p.has('fs.write') || p.has('child') || p.has('worker')) refuse('safety: the process is not running under the required permission set');
  let denied = false;
  try { fs.writeFileSync(denyProbe, 'x'); } catch (e) { denied = e.code === 'ERR_ACCESS_DENIED'; }
  if (!denied) refuse('safety: a file write was not denied');
  if (!globalThis.__AC38_NET__) refuse('safety: the network guard is not active');
  let netDenied = false;
  try { new net.Socket().connect(9, '127.0.0.1'); } catch (e) { netDenied = /network guard/.test(e.message); }
  if (!netDenied) refuse('safety: the network guard is not active');
  for (const v of ['H1R_STAGE_AUTHORISED', 'M7_RUN_WARMSTORE', 'M7_RUN_CRASH', 'NODE_OPTIONS']) if (process.env[v] !== undefined) refuse(`safety: ${v} is set`);
  return { fsWriteDenied: true, childDenied: true, workerDenied: true, networkGuard: true, cwdAtStart: path.basename(process.cwd()) };
}
