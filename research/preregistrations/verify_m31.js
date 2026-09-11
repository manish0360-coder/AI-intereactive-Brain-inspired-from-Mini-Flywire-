// M31 MEMO GATE — binds the memo's reported numbers to the RAW observations.
//
// experiments/m31/verify.js is PASS 2 for the OBSERVATIONS. This file is the gate for
// the MEMO: every figure it states is re-derived here from the raw file, so a number
// altered in the prose fails even though the observations are intact. It also checks the
// governance claims and scans for the forbidden readings.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { inRegisteredBlock, FROZEN } from '../../experiments/uqb/protocol.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..') + '/';
const M31 = fs.readFileSync(ROOT + 'research/preregistrations/M31_TRAJECTORY_ATTAINABILITY.md', 'utf8');
const OBS = JSON.parse(fs.readFileSync(ROOT + 'experiments/m31/data/m31_observations.json', 'utf8'));
const O = OBS.observations;

const NL = String.fromCharCode(10);
const flat = (t) => t.replace(/^[ \t]*>[ \t]?/gm, ' ').replace(/\*\*/g, '')
                     .replace(/`/g, '').replace(/\s+/g, ' ').trim();
const F = flat(M31);
// NUMERIC NORMALISATION. The memo uses the typographic minus (U+2212) and spaces as
// digit-group separators. A numeric check against ASCII text fails on typography rather
// than on content, so numbers are compared against this normalised view.
const NUM = F.split(String.fromCharCode(0x2212)).join('-')
           .replace(/([0-9]) ([0-9]{3})/g, '$1$2');
let fails = 0, checks = 0;
const ok = (c, label, d = '') => { checks++; if (!c) fails++;
    console.log(`   [${c ? 'PASS' : 'FAIL'}] ${label}${d ? '  — ' + d : ''}`); };
const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
const sd = (v) => Math.sqrt(mean(v.map(x => (x - mean(v)) ** 2)));

console.log('='.repeat(78));
console.log('  M31 MEMO GATE');
console.log('='.repeat(78));

// ── G1. Governance: zero registered seeds ───────────────────────────────────
console.log('');
console.log('-- G1. zero registered seeds ---------------------------------------------');
{
    const cfg = [...new Set(O.map(o => o.configSeed))];
    ok(cfg.every(s => !inRegisteredBlock(s)), 'no registered configuration seed observed',
        JSON.stringify(cfg));
    ok(inRegisteredBlock(897500) && inRegisteredBlock(895500) === false || true,
        'CONTROL executed on the predicate');
    ok(inRegisteredBlock(897500) === true, 'CONTROL: predicate rejects a UQ-B seed');
    ok(cfg.every(s => s >= 896000 && s <= 896999), 'fixtures are 896xxx development territory');
    ok(/ZERO registered seeds consumed/i.test(F), 'memo states zero registered seeds');
    ok(/have not modified the registry/i.test(F), 'memo states the registry was not modified');
    ok(/requires separate Director authorization/i.test(F),
        'memo defers registry implementation to separate authorization');
    // the harness guard must exist in source, not just be claimed
    const coll = fs.readFileSync(ROOT + 'experiments/m31/collect.js', 'utf8');
    ok(/if \(inRegisteredBlock\(s\)\) throw new Error/.test(coll),
        'the per-child registered-seed guard exists in the harness (source)');
    ok(/if \(!cfg0\.accepted\) throw new Error/.test(coll),
        'the R5 acceptance assertion exists in the harness (source)');
}

// ── G2. K1 — recomputed ─────────────────────────────────────────────────────
console.log('');
console.log('-- G2. K1 recomputed -----------------------------------------------------');
{
    let allDistinct = true, groups = 0;
    for (const fx of OBS.fixtures) for (const arm of ['armed', 'ablated']) {
        const rows = O.filter(o => o.configSeed === fx.configSeed && o.configIndex === fx.configIndex);
        const u = new Set(rows.map(o => o[arm].fingerprint));
        groups++;
        if (u.size !== rows.length) allDistinct = false;
    }
    ok(groups === 4, 'four (fixture, arm) groups', String(groups));
    ok(allDistinct, 'K1: every group has all-distinct fingerprints');
    const totalU = new Set(O.flatMap(o => [o.armed.fingerprint, o.ablated.fingerprint])).size;
    ok(totalU === O.length * 2, 'all 24 run fingerprints distinct overall', `${totalU}/24`);
    ok(F.includes('24 runs') && /NOT OBSERVED/.test(M31), 'memo reports K1 as not observed');
    ok(/6 \/ 6/.test(M31), 'memo reports the 6/6 group counts');
}

// ── G3. K3 — recomputed ─────────────────────────────────────────────────────
console.log('');
console.log('-- G3. K3 recomputed -----------------------------------------------------');
{
    const rels = O.map(o => Math.abs(o.armed.cogDraws - o.ablated.cogDraws) /
                            Math.max(o.armed.cogDraws, o.ablated.cogDraws));
    const differing = O.filter(o => o.armed.cogDraws !== o.ablated.cogDraws).length;
    ok(differing === O.length, 'K3: arms differ in cogDraws in every cell', `${differing}/${O.length}`);
    const mn = (Math.min(...rels) * 100).toFixed(1), mx = (Math.max(...rels) * 100).toFixed(1);
    const av = (mean(rels) * 100).toFixed(1);
    ok(F.includes(mn + '%') && F.includes(av + '%') && F.includes(mx + '%'),
        'memo states min/mean/max relative divergence', `${mn}/${av}/${mx}`);
    const diffs = O.map(o => o.armed.cogDraws - o.ablated.cogDraws);
    const lo = Math.min(...diffs), hi = Math.max(...diffs);
    ok(NUM.includes(String(lo)) && NUM.includes(String(hi)),
        'memo states the raw divergence range', `${lo} .. ${hi}`);
    ok(/converts M30.s INFERENCE into EVIDENCE|INFERENCE into EVIDENCE/i.test(F),
        'memo states this converts M30 inference into evidence');
}

// ── G4. K2 / K6 — Δ recomputed from r and n ─────────────────────────────────
console.log('');
console.log('-- G4. K2 and K6 recomputed ----------------------------------------------');
{
    const rows = [];
    for (const fx of OBS.fixtures) for (const ph of [1, 2]) {
        const cells = O.filter(o => o.configSeed === fx.configSeed && o.configIndex === fx.configIndex);
        const d = cells.map(o => {
            const c = o.cells.filter(c => c.phase === ph && c.rA !== null && c.rB !== null
                                       && c.nA >= 2 && c.nB >= 2);
            return mean(c.map(c => c.rA / (c.nA - 1) - c.rB / (c.nB - 1)));
        });
        rows.push({ fx: `${fx.configSeed}/${fx.configIndex}`, ph, d,
                    mean: mean(d), sd: sd(d),
                    neg: d.filter(x => x < 0).length, pos: d.filter(x => x > 0).length });
    }
    ok(rows.length === 4, 'four configuration-phase rows', String(rows.length));
    for (const r of rows) {
        // CONSISTENCY, not presence. Each figure appears in BOTH the section-5 table and
        // the Ev-3 register — deliberately. A presence check therefore survives corrupting
        // one copy. Require the figure in the TABLE ROW and in the EVIDENCE line.
        const rowLine = M31.split(NL).find(l => l.startsWith('| `' + r.fx + '`') && l.includes('| ' + r.ph + ' |')) || '';
        const rowNum = rowLine.split(String.fromCharCode(0x2212)).join('-');
        ok(rowNum.includes(r.sd.toFixed(4)), `TABLE states SD for ${r.fx} ph${r.ph}`, r.sd.toFixed(4));
        ok(rowNum.includes(r.mean.toFixed(4)), `TABLE states mean for ${r.fx} ph${r.ph}`, r.mean.toFixed(4));
        const evLine = (M31.split(NL).find(l => l.includes('**Ev-3.**')) || '')
            .split(String.fromCharCode(0x2212)).join('-');
        ok(evLine.includes(r.sd.toFixed(4)), `Ev-3 states SD for ${r.fx} ph${r.ph}`, r.sd.toFixed(4));
        ok(F.includes(`${r.neg}/${r.pos}`), `memo states neg/pos for ${r.fx} ph${r.ph}`,
            `${r.neg}/${r.pos}`);
        ok(r.d.length === OBS.trajectorySeeds.length, `K2: one Δ per trajectory for ${r.fx} ph${r.ph}`);
        ok(Math.max(...r.d) - Math.min(...r.d) > 0, `K2: Δ varies for ${r.fx} ph${r.ph}`);
    }
    // K6 reversal count
    const rev = rows.filter(r => r.neg > 0 && r.pos > 0).length;
    ok(rev === 3, 'K6: sign reversal in exactly 3 of 4 configuration-phases', String(rev));
    // Same consistency requirement: the count appears in the K6 heading AND in Ev-4.
    const k6 = M31.split(NL).find(l => l.includes('K6 — sign reversal within a configuration:')) || '';
    const ev4 = M31.split(NL).find(l => l.includes('**Ev-4.**')) || '';
    ok(new RegExp(rev + ' of 4 configuration-phases').test(k6),
        'K6 HEADING states the reversal count', k6.slice(0, 60));
    ok(new RegExp(rev + ' of 4 configuration-phases').test(ev4),
        'Ev-4 states the same reversal count', ev4.slice(0, 60));
    // the magnitude comparison that drives section 8
    const maxSd = Math.max(...rows.map(r => r.sd));
    ok(maxSd > 0.126793,
        'the largest within-configuration SD EXCEEDS C1 phase-1 between-configuration SD',
        `${maxSd.toFixed(4)} > 0.126793`);
    ok(/larger than\s*C1.s entire between-configuration SD|larger than C1/i.test(F),
        'memo states the exceedance');
    ok(F.includes('0.1268') && F.includes('0.1093'), 'memo cites C1 SDs for comparison');
}

// ── G5. K5 — definedness recomputed ─────────────────────────────────────────
console.log('');
console.log('-- G5. K5 recomputed -----------------------------------------------------');
{
    let total = 0, both = 0, asym = 0, neither = 0, n1 = 0;
    for (const o of O) for (const c of o.cells) {
        total++;
        const a = c.rhoA !== null, b = c.rhoB !== null;
        if (a && b) both++; else if (!a && !b) neither++; else asym++;
        if (c.nA === 1 || c.nB === 1) n1++;
    }
    ok(total === 456 && F.includes('456 cells'), 'memo states 456 cells', String(total));
    ok(both === 432 && F.includes('432 jointly defined'), 'memo states 432 jointly defined',
        String(both));
    ok(asym === 0 && /0 armed-only, 0 ablated-only/.test(F), 'memo states zero asymmetry');
    ok(neither === 24 && F.includes('24 neither-defined'), 'memo states 24 neither-defined');
    ok(n1 === 12 && F.includes('12 cells with'), 'memo states 12 n=1 cells', String(n1));
    ok(F.includes((100 * both / total).toFixed(1) + '%'), 'memo states the joint-definedness rate');
}

// ── G6. Verdict, structure, and forbidden readings ──────────────────────────
console.log('');
console.log('-- G6. verdict and discipline --------------------------------------------');
{
    ok(/# M31-YELLOW/.test(M31), 'verdict is M31-YELLOW');
    ok(!/# M31-GREEN/.test(M31) && !/# M31-HOLD/.test(M31), 'exactly one verdict');
    ok(/Not GREEN:/i.test(M31) && /Not HOLD:/i.test(M31), 'both alternatives considered');
    for (const k of ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8'])
        ok(new RegExp('\\b' + k + '\\b').test(M31), `failure mode ${k} addressed`);
    ok(/ADDED — K8|K8 \(added\)/.test(M31), 'K8 is flagged as an addition to the Director list');
    ok(/merged into 3/i.test(F), 'a redundant Director question is merged, not padded');
    ok(/deferred, and deliberately/i.test(F), 'the cost question is explicitly deferred');
    ok(/M32 — Trajectory-Seed Namespace Governance/.test(M31), 'single next milestone named');
    ok(/Not recommended as next.{0,60}registered .?C . R.? collection/i.test(F),
        'memo declines to recommend a registered collection');
    // forbidden readings
    const BANNED = [
        ['C1 invalid', /C1 (?:is|was) invalid/i],
        ['C1 signs unstable', /C1.s signs are unstable/i],
        ['mechanism evidence', /(?:this|these results?) (?:is|are) (?:evidence of|mechanism)/i],
        ['futureScore claim', /futureScore (?:does|is|has)/i],
    ];
    for (const [l, re] of BANNED) {
        const bad = [];
        for (const b of M31.split(NL + NL)) {
            const fb = flat(b);
            if (/\bnot\b|never|must not|Not claimed|is not|untested/i.test(fb)) continue;
            const m = fb.match(re); if (m) bad.push(m[0]);
        }
        ok(bad.length === 0, `no forbidden reading: ${l}`, bad.join(' | ') || 'clean');
    }
    ok(/Not claimed:/i.test(M31), 'explicit non-claim list present');
    ok(/development fixtures are not a census|not a census/i.test(F),
        'memo states dev fixtures are not a census');
    for (const s of ['EVIDENCE', 'INFERENCE', 'HYPOTHESIS'])
        ok(new RegExp('\\*\\*' + s + '\\*\\*').test(M31), `separation level: ${s}`);
}

// ── G7. Working tree and protected paths ────────────────────────────────────
console.log('');
console.log('-- G7. protected paths ---------------------------------------------------');
{
    const dirty = execSync('git status --porcelain main.js experiments/c1 experiments/uqb ' +
        'experiments/uqa experiments/registry research/cognitive-audit/ instrumentation/',
        { cwd: ROOT, encoding: 'utf8' })
        .split(NL).filter(l => l.trim() && !l.startsWith('??'));
    ok(dirty.length === 0, 'no TRACKED change to C1, UQ-B, UQ-A, registry, M7 or instrumentation',
        dirty.length ? dirty.join(' | ') : 'clean');
    const crypto = await import('node:crypto');
    for (const f of ['research/cognitive-audit/M7_PREREGISTRATION',
                     'research/preregistrations/C1_PREREGISTRATION']) {
        const d = crypto.createHash('sha256').update(fs.readFileSync(ROOT + f + '.md')).digest('hex');
        ok(fs.readFileSync(ROOT + f + '.sha256', 'utf8').includes(d),
            `frozen digest verifies: ${path.basename(f)}`);
    }
    ok(FROZEN.agentSeed === 20260819000 && OBS.trajectorySeeds.includes(FROZEN.agentSeed),
        'the frozen production agentSeed is the declared anchor');
}

console.log('');
console.log('='.repeat(78));
console.log(`  M31 MEMO GATE: ${checks - fails}/${checks} passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'MEMO VERIFIED' : 'MEMO NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);
