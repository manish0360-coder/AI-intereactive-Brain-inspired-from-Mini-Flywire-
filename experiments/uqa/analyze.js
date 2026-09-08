// ==========================================================
// UQ-A ANALYSIS — the §6 primary outcome and the §12 co-primary diagnostic
// ==========================================================
// SOLE SCIENTIFIC AUTHORITY
//   research/preregistrations/UQA_PREREGISTRATION.md §6–§13, frozen at 63247bb,
//   digest 03eba04ac908861332fb2d7b0d3c0994468e1bd5ab5f78a5acf092dcd20196c4.
//
// WHAT THIS COMPUTES, and nothing else
//   §6  rho(Q_final, pPhase1) and rho(Q_final, pPhase2), per arm, per config
//   §12 coverage — explicit Q entries among the fixed population, per arm
//   §9  the per-arm count of population entries excluded as non-edges
//
// WHAT THIS DOES NOT COMPUTE — §11
//   No p-value, no confidence interval, no hypothesis test, no significance
//   claim, no effect size, no model. §11 forbids all of them and forbids adding
//   them after data exists. Nothing here pools the two phases (§10), adjusts for
//   coverage (§12), or excludes an unvisited entry (§8).
//
// THE SPEARMAN IMPLEMENTATION IS COPIED, NOT REWRITTEN — §6 / F9
//   §6 requires "the repository's committed Spearman implementation (F9) …
//   returning 0 when either variable is constant". F9 cites experiments/m7/env.js.
//   That function is module-private there and env.js may not be modified, so the
//   only faithful option is a VERBATIM copy. assertSpearmanFidelity() re-extracts
//   the function text from env.js at run time and compares it byte for byte with
//   the copy below, so a divergence is a thrown error rather than a silent drift.
//
//   This matters: the repository contains a SECOND Spearman, in
//   experiments/m7/verify_G15.js, which returns NaN rather than 0 for a constant
//   vector. §6's wording and F9's citation both designate env.js's. The fidelity
//   assertion is what makes that designation checkable instead of merely asserted.
//
// THE POPULATION IS FIXED A PRIORI AND ARM-INDEPENDENT — §7
//   It is built from connections.json — the same file env.js reads — before any
//   Q table is seen, and the identical object is passed to both arms.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeStateKey } from '../../render/qlearning.js';
import * as env from '../m7/env.js';
import { FROZEN } from './protocol.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');

// ---------------------------------------------------------------------------
// §6 / F9 — VERBATIM COPY of experiments/m7/env.js `spearman`.
// Do not reformat, retype, or "improve" the body below. Its byte identity with
// env.js is asserted at run time and any edit will fail that assertion.
// ---------------------------------------------------------------------------
function spearman(x, y) {
  const rank = (v) => {
    const idx = v.map((val, i) => [val, i]).sort((a, b) => a[0] - b[0]);
    const r = new Array(v.length);
    for (let i = 0; i < idx.length;) {
      let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  };
  const rx = rank(x), ry = rank(y), n = x.length;
  const mx = rx.reduce((a, b) => a + b, 0) / n, my = ry.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { const a = rx[i] - mx, b = ry[i] - my; num += a * b; dx += a * a; dy += b * b; }
  return (dx === 0 || dy === 0) ? 0 : num / Math.sqrt(dx * dy);
}
// ---------------------------------------------------------------------------
export { spearman };

// The exact opening line of the committed function, used to locate it.
const SPEARMAN_OPEN  = 'function spearman(x, y) {';
// Its terminator: the first line that is exactly a closing brace at column 0.
const SPEARMAN_CLOSE = '}';

/** Extracts a top-level function's source text from a file's contents. */
function extractSpearman(text) {
    const lines = text.split(/\r?\n/);
    const at = lines.indexOf(SPEARMAN_OPEN);
    if (at < 0) return null;
    for (let i = at + 1; i < lines.length; i++) {
        if (lines[i] === SPEARMAN_CLOSE) return lines.slice(at, i + 1).join('\n');
    }
    return null;
}

/**
 * §6 / F9 fidelity. Throws unless the copy above is byte-identical to the
 * committed env.js definition. Called before any rho is computed.
 */
export function assertSpearmanFidelity() {
    const committed = extractSpearman(
        fs.readFileSync(path.join(ROOT, 'experiments/m7/env.js'), 'utf8'));
    if (committed === null) {
        throw new Error('UQ-A: could not locate `spearman` in experiments/m7/env.js. §6 designates ' +
            'that implementation (F9) and this analysis refuses to run without proving it is the ' +
            'one being used.');
    }
    const local = extractSpearman(fs.readFileSync(path.join(HERE, 'analyze.js'), 'utf8'));
    if (local === null) {
        throw new Error('UQ-A: could not locate the local `spearman` copy in analyze.js.');
    }
    if (local !== committed) {
        throw new Error('UQ-A: the local Spearman copy is NOT byte-identical to the committed ' +
            'experiments/m7/env.js implementation designated by §6/F9. The primary outcome would ' +
            'be computed by an unregistered statistic.');
    }
    // The degenerate behaviour §6 names in words, asserted behaviourally. This
    // is the property that distinguishes env.js's implementation from the one
    // in verify_G15.js, which returns NaN here.
    const c = spearman([1, 1, 1], [1, 2, 3]);
    if (c !== 0) {
        throw new Error(`UQ-A: the designated Spearman returned ${c} for a constant vector; ` +
            `§6 requires 0.`);
    }
    return committed;
}

/**
 * §7 — the fixed population: both directed traversals of each physical
 * connection, built from connections.json, the same file env.js reads.
 * Ordered by connections.json entry index then direction, so it is stable,
 * arm-independent, and fixed before any Q table exists.
 */
export function buildPopulation() {
    const edges = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'));
    if (edges.length !== FROZEN.physicalEdges) {
        throw new Error(`UQ-A: connections.json holds ${edges.length} entries, frozen §7 states ` +
            `${FROZEN.physicalEdges}.`);
    }
    const population = [];
    edges.forEach((e, i) => {
        const a = Number(e.from), b = Number(e.to);
        if (a === b) {
            throw new Error(`UQ-A: connections.json entry ${i} is a self-loop; F7 states none.`);
        }
        population.push({ entry: i, pos: a, action: b, direction: 'forward' });
        population.push({ entry: i, pos: b, action: a, direction: 'reverse' });
    });
    if (population.length !== FROZEN.directedAdjacencies) {
        throw new Error(`UQ-A: population size ${population.length}, frozen §7 states ` +
            `${FROZEN.directedAdjacencies}.`);
    }
    // Cross-check against the committed graph accessor rather than trusting the
    // reconstruction: env's own directed-adjacency count must agree.
    const gi = env.graphInfo();
    if (gi.directedAdjacencies !== FROZEN.directedAdjacencies
        || gi.entries !== FROZEN.physicalEdges) {
        throw new Error(`UQ-A: env.graphInfo() reports ${gi.entries} entries / ` +
            `${gi.directedAdjacencies} directed adjacencies; frozen §7 states ` +
            `${FROZEN.physicalEdges} / ${FROZEN.directedAdjacencies}.`);
    }
    return population;
}

/**
 * §6, §8, §9, §12 for ONE arm of ONE configuration.
 *
 * @param {object} o
 *   population  the §7 fixed population (the identical object for both arms)
 *   qEntries    [[key, value], ...] — the FULL end-of-run Q table, verbatim
 *   goal        the run's goal (F11: constant per run)
 *   pPhase1     env reliability vector for phase 1, indexed by connections entry
 *   pPhase2     env reliability vector for phase 2
 */
export function analyzeArm({ population, qEntries, goal, pPhase1, pPhase2 }) {
    const Q = new Map(qEntries);
    if (Q.size !== qEntries.length) {
        throw new Error(`UQ-A: the Q table contains duplicate keys (${qEntries.length} rows, ` +
            `${Q.size} distinct); the dump is corrupt.`);
    }

    const x = [], y1 = [], y2 = [];
    const rows = [];
    let coverage = 0, excludedNonEdge = 0;

    for (const p of population) {
        // §9 — no ground truth exists for a non-edge, so it is excluded and counted.
        const edgeIndex = env.edgeIndexOf(p.pos, p.action);
        if (edgeIndex === undefined) { excludedNonEdge++; continue; }

        // §6 — the read is exactly the repository's key construction (F6).
        const key = makeStateKey(p.pos, goal) + '->' + p.action;
        const present = Q.has(key);
        // §12 — coverage counts EXPLICIT entries; it never filters the population.
        if (present) coverage++;
        // §8 — absent is 0, the neutral pre-learning representation. Never excluded.
        const q = present ? Q.get(key) : 0;

        x.push(q);
        y1.push(pPhase1[edgeIndex]);
        y2.push(pPhase2[edgeIndex]);
        rows.push({ entry: p.entry, pos: p.pos, action: p.action, direction: p.direction,
                    edgeIndex, key, present, q,
                    pPhase1: pPhase1[edgeIndex], pPhase2: pPhase2[edgeIndex] });
    }

    // §10 — reported separately. The two are NEVER pooled or averaged.
    return {
        n: x.length,
        excludedNonEdge,
        coverage,
        coverageDenominator: x.length,
        rhoPhase1: spearman(x, y1),
        rhoPhase2: spearman(x, y2),
        qTableEntries: qEntries.length,
        rows,
    };
}
