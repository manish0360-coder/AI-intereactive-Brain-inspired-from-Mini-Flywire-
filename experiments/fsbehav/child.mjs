// Registers the arm's loader hook (if any) BEFORE main.js is imported, then runs one measurement.
// Hooks are instrumentation: they rewrite module source in memory and never touch a file on disk.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

if (process.env.HOOK) register(pathToFileURL(process.env.HOOK).href, import.meta.url);

await import('./run.mjs');
