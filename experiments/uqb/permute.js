// ==========================================================
// UQ-B PERMUTATION MACHINERY — frozen §6
// ==========================================================
// SOLE SCIENTIFIC AUTHORITY
//   research/preregistrations/UQB_PREREGISTRATION.md, frozen at 3b3d195, digest
//   bc655022b63e8022ed6427001da6a90eb2f9ec139cf413ab367e9bc7269ba46e, §6.
//
// WHAT THIS IS
//   The generator for the §6 arrangements and the guard object the injected
//   pre-pass calls. It permutes ONE thing — which candidate receives which
//   `futureBonus` value — and nothing else.
//
// WHAT IT MUST NOT TOUCH, and does not (§6.2)
//   candidate identity · candidate topology · legality · candidate ordering ·
//   any other score term · the RNG realisation · agent or environment state ·
//   the phase · the readout procedure.
//
// SEPARATE STREAM, DELIBERATELY (§6.6)
//   Permutations are drawn from a self-contained deterministic generator seeded
//   by a frozen function of (configuration seed, arm, shuffle index, state).
//   It NEVER draws from the `cognitive`, `visual` or `environment` streams: doing
//   so would perturb the very readout it exists to leave untouched.
//
// DISTINCTNESS IS REQUIRED, AND §6.5 SAYS WHY
//   A shuffled arrangement equal to the identity necessarily TIES with the
//   observed value, and the §12 tie rule then blocks rejection — so collisions
//   would make the realised level a function of collision frequency rather than
//   of K. Distinctness keeps it exactly 1/(K+1).
// ==========================================================

/** §6.4 — frozen. Not adaptive, not extendable, not reducible. */
export const K = 19;

/** Arrangement 0 is the observed identity arrangement, one of the K+1 members. */
export const IDENTITY = 0;

export const ARMS = Object.freeze(['ARMED', 'ABLATED']);

/** §5.1 — the ablated value is exactly 0. */
export const ABLATED_VALUE = 0;

// ---------------------------------------------------------------------------
// A self-contained 32-bit generator. mulberry32 — small, deterministic, and
// entirely independent of instrumentation/rng.js, which is the point.
// ---------------------------------------------------------------------------
function mulberry32(a) {
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** FNV-1a over the seed tuple. Deterministic, order-sensitive, and frozen. */
export function seedFor(configSeed, arm, shuffleIndex, state, attempt = 0) {
    const s = `${configSeed}|${arm}|${shuffleIndex}|${state}|${attempt}`;
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}

/** Fisher-Yates over [0..n-1] from a seeded stream. Pure. */
export function permutationFor(seed, n) {
    const rnd = mulberry32(seed);
    const a = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export const isIdentity = (sigma) => sigma.every((v, i) => v === i);

/** Canonical string for an arrangement: the per-state permutations in state order. */
export function arrangementKey(perStateSigma, states) {
    return states.map(u => perStateSigma[u].join(',')).join(';');
}

/**
 * §6.3-§6.5 — build the K shuffled arrangements over a fixed set of states.
 *
 * @param {object} o
 *   configSeed  the configuration this arrangement set belongs to
 *   arm         'ARMED' | 'ABLATED'
 *   states      the §7 population, in the frozen ascending order
 *   sizes       Map state -> candidate count n(u)
 *   k           defaults to the frozen K
 *
 * Returns { identity, shuffles, seeds, attempts, distinct }.
 *
 * AN ARRANGEMENT IS A SEED TABLE, NOT A FIXED-LENGTH VECTOR, and that is forced
 * by source rather than chosen. `runPrediction(u)` runs STEPS iterations
 * (main.js:1484-1492); each step scores a DIFFERENT current node with a
 * different `allCandidates`, so the candidate count varies WITHIN one readout.
 * §6.7 requires the arrangement to apply at every scoring decision inside the
 * readout, so a single fixed-length permutation cannot express it. An
 * arrangement is therefore identified by its per-state SEED, and materialises at
 * each decision as `permutationFor(seed, n)` for that decision's own n.
 *
 * This is an implementation detail under §29 ("the readout driver"), not a
 * scientific decision: §6 fixes what is permuted and how arrangements are
 * seeded, and is silent on how sigma adapts to n because any correct
 * implementation must handle it.
 *
 * `shuffles[j][u]` is the permutation materialised at the STEP-0 candidate
 * count — the only decision that bears the §10 statistic — and distinctness is
 * enforced on exactly those.
 *
 * Distinctness is enforced by REDRAW at the arrangement level: if a drawn
 * arrangement collides with the identity or with one already accepted, the whole
 * arrangement is redrawn at the next attempt index. The attempt index enters the
 * seed, so the redraw is deterministic and reproducible.
 */
export function buildArrangements({ configSeed, arm, states, sizes, k = K }) {
    if (!ARMS.includes(arm)) throw new Error(`UQ-B: arm ${JSON.stringify(arm)} is not ARMED or ABLATED.`);
    if (!Array.isArray(states) || states.length === 0) {
        throw new Error('UQ-B: the state population is empty; §7 requires the full 19-state set.');
    }
    for (const u of states) {
        const n = sizes.get(u);
        if (!Number.isInteger(n) || n < 1) {
            throw new Error(`UQ-B: state ${u} has candidate count ${n}; a permutation needs n >= 1.`);
        }
    }

    // The permutation space must be large enough to hold k distinct non-identity
    // arrangements, or distinctness is unsatisfiable and the redraw would spin.
    // log(space) = sum over states of log(n(u)!).
    let logSpace = 0;
    for (const u of states) {
        const n = sizes.get(u);
        for (let i = 2; i <= n; i++) logSpace += Math.log(i);
    }
    if (logSpace <= Math.log(k + 1)) {
        throw new Error(`UQ-B: the arrangement space is too small for ${k} distinct non-identity ` +
            `arrangements (log-space ${logSpace.toFixed(3)}). Distinctness is unsatisfiable and ` +
            `the §12 level could not be ${1 / (k + 1)}.`);
    }

    const identity = {};
    for (const u of states) identity[u] = [...Array(sizes.get(u)).keys()];

    const seen = new Set([arrangementKey(identity, states)]);
    const shuffles = [];
    const seeds = [];
    let attempts = 0;

    for (let j = 1; j <= k; j++) {
        let attempt = 0, accepted = null, acceptedSeeds = null;
        // Bounded: the space check above guarantees a free arrangement exists,
        // and the bound turns a pathological generator into a thrown error
        // rather than a hang.
        for (; attempt < 10000; attempt++) {
            attempts++;
            const seedRow = {}, sigma = {};
            for (const u of states) {
                seedRow[u] = seedFor(configSeed, arm, j, u, attempt);
                sigma[u] = permutationFor(seedRow[u], sizes.get(u));
            }
            const key = arrangementKey(sigma, states);
            if (!seen.has(key)) {
                seen.add(key); accepted = sigma; acceptedSeeds = seedRow; break;
            }
        }
        if (!accepted) {
            throw new Error(`UQ-B: could not draw a distinct arrangement ${j} within the attempt ` +
                `bound. Distinctness could not be enforced and the §12 level would not be exact.`);
        }
        shuffles.push(accepted);
        seeds.push(acceptedSeeds);
    }

    return { identity, shuffles, seeds, attempts, distinct: seen.size === k + 1 };
}

/**
 * The guard object the injected pre-pass calls (`globalThis.__UQB__`).
 *
 * `buildFutureBonus(keys, compute)` receives the candidate keys in
 * `allCandidates` iteration order and a pure function computing the committed
 * post-cap `futureBonus` for one key. It returns a Map key -> value.
 *
 * ORDER OF OPERATIONS, and it matters:
 *   1. compute the committed value for every candidate  (identical in all arms)
 *   2. §5.1 — if ABLATED, replace every value with exactly 0
 *   3. §6.2 — apply this arrangement's permutation to the value vector
 *   4. map candidate key -> value, preserving candidate identity and order
 *
 * Under ABLATED every value is 0, so step 3 is a permutation of a constant
 * vector and every arrangement is identical — which is precisely the §12
 * mandatory wiring control, obtained by construction rather than by a special
 * case in the code.
 */
export function makeGuard({ arm, sigmaFor, onDecision = null }) {
    if (!ARMS.includes(arm)) throw new Error(`UQ-B: arm ${JSON.stringify(arm)} is not ARMED or ABLATED.`);
    if (typeof sigmaFor !== 'function') throw new Error('UQ-B: sigmaFor must be a function.');

    return {
        arm,
        buildFutureBonus(keys, compute) {
            const values = keys.map(compute);
            const delivered = arm === 'ABLATED' ? values.map(() => ABLATED_VALUE) : values;

            const sigma = sigmaFor(keys.length);
            if (!Array.isArray(sigma) || sigma.length !== keys.length) {
                throw new Error(`UQ-B: sigmaFor returned a permutation of length ` +
                    `${sigma && sigma.length} for ${keys.length} candidates.`);
            }
            const sorted = [...sigma].sort((a, b) => a - b);
            if (!sorted.every((v, i) => v === i)) {
                throw new Error('UQ-B: sigmaFor did not return a permutation of 0..n-1; the value ' +
                    'multiset would not be preserved.');
            }

            const out = new Map();
            keys.forEach((k, i) => out.set(k, delivered[sigma[i]]));
            if (onDecision) onDecision({ keys, values, delivered, sigma, out });
            return out;
        },
    };
}
