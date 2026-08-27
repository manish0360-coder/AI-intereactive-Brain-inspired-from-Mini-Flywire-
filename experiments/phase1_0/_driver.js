// Shared headless driver used by the F2 tests. Boots the REAL main.js.
import { installThreeStub, installDomStub, installFetchStub, installTimerControl, settle }
  from '../../benchmarks/harness/headlessShim.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export async function boot(opts = {}) {
  // Signature preserved: boot({ seed, goal, quiet }). `seed` is consumed at
  // initRng below; `quiet` suppresses console. The vestigial `goal = 16`
  // default is deliberately NOT transported -- only a goal the caller
  // EXPLICITLY supplies is forwarded, so every existing caller (all of which
  // pass { seed } only) is bit-identical to before.
  const { seed, goal = 16, quiet = true } = opts;   // eslint-disable-line no-unused-vars
  installThreeStub();
  const dom = installDomStub();
  installFetchStub(ROOT);
  const timer = installTimerControl();

  const realLog = console.log, realWarn = console.warn;
  if (quiet) { console.log = () => {}; console.warn = () => {}; }

  const { initRng } = await import('../../instrumentation/rng.js');
  initRng(seed);

  // Bootstrap transport of the already-frozen experiment goal, in the same
  // role initRng(seed) plays for the agent seed. Set BEFORE the import so the
  // main.js initialisation boundary can receive it. Consumes no RNG.
  if (opts.goal != null) globalThis.__M7_GOAL__ = opts.goal;

  // import the REAL application
  const main = await import('../../main.js');   // ONE instance; re-importing re-runs the app
  await settle(20);                       // let the fetch->neurons->connections chain finish

  const restore = () => { console.log = realLog; console.warn = realWarn; };
  return { dom, timer, restore, ROOT, main };
}

/** press SPACE, exactly as a user would, to start the agent loop */
export function pressSpace(dom) {
  dom.listeners.keydown.forEach(fn => fn({ code:'Space', shiftKey:false, altKey:false,
                                           getModifierState: () => false }));
}
