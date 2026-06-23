// ======================================
//  — M1 (The Spine)
// ======================================
// Consumes bus events and persists a reproducible run folder:
//   telemetry/<runId>/raw/<channel>.jsonl
//   telemetry/<runId>/manifest.json   (seed, codeHash, config, counts)
//
// Environment-aware: in Node it writes files; in the browser it buffers
// in memory and exposes dump()/download() (no filesystem there). Either
// way the event stream is identical, so analysis is environment-blind.
// ======================================

import { subscribe } from "./telemetryBus.js";

const isNode =
    typeof process !== "undefined" &&
    process.versions != null &&
    process.versions.node != null;

export function createRecorder({ runId, seed, codeHash = "unknown", config = {}, outDir = null }) {
    const buffers = new Map();        // channel -> array of envelopes
    let count = 0;

    const unsub = subscribe((ev) => {
        if (!buffers.has(ev.channel)) buffers.set(ev.channel, []);
        buffers.get(ev.channel).push(ev);
        count++;
    });

    function manifest() {
        const perChannel = {};
        for (const [ch, arr] of buffers) perChannel[ch] = arr.length;
        return {
            runId,
            seed,
            codeHash,
            schemaVersion: "1.0.0",
            createdAt: new Date().toISOString(),
            config,
            eventCount: count,
            perChannel,
        };
    }

    // In-memory access (works in any environment).
    function dump() {
        const out = {};
        for (const [ch, arr] of buffers) out[ch] = arr;
        return { manifest: manifest(), events: out };
    }

    // Node-only persistence.
    async function flush() {
        if (!isNode) return dump();        // browser: caller handles dump()/download
        const fs = await import("node:fs");
        const path = await import("node:path");
        const base = outDir || path.join("telemetry", runId);
        const raw = path.join(base, "raw");
        fs.mkdirSync(raw, { recursive: true });
        for (const [ch, arr] of buffers) {
            const lines = arr.map((e) => JSON.stringify(e)).join("\n");
            fs.writeFileSync(path.join(raw, `${ch}.jsonl`), lines + (lines ? "\n" : ""));
        }
        fs.writeFileSync(path.join(base, "manifest.json"), JSON.stringify(manifest(), null, 2));
        return { base, manifest: manifest() };
    }

    return { manifest, dump, flush, stop: unsub, get count() { return count; } };
}