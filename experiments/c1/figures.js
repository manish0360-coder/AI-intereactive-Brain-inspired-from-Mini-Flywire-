// ==========================================================
// C1 — THE MANDATORY VISUALISATIONS (§9.7), V1-V8
// ==========================================================
// Self-contained SVG. No plotting library, no network, no fitted lines, no
// trend estimates, no error bars, no confidence bands, no significance
// annotation. V2's reference line at 0 and V6's identity line are the ONLY
// lines drawn, and both are named in the frozen specification.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RES = path.join(HERE, 'results');
const FIG = path.join(RES, 'figures');

const W = 720, H = 340, M = { l: 64, r: 20, t: 44, b: 52 };
const iw = W - M.l - M.r, ih = H - M.t - M.b;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (x) => (Math.abs(x) >= 1000 || (x !== 0 && Math.abs(x) < 0.001))
    ? x.toExponential(1) : (+x.toFixed(4)).toString();

function frame(title, sub, body) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="ui-monospace,Menlo,Consolas,monospace">
<rect width="${W}" height="${H}" fill="#ffffff"/>
<text x="${M.l}" y="22" font-size="14" font-weight="700" fill="#111">${esc(title)}</text>
<text x="${M.l}" y="38" font-size="10.5" fill="#555">${esc(sub)}</text>
${body}
</svg>`;
}
const axes = (x0, x1, y0, y1, xlab, ylab, xticks, yticks) => {
    const sx = (v) => M.l + (x1 === x0 ? iw / 2 : (v - x0) / (x1 - x0) * iw);
    const sy = (v) => M.t + ih - (y1 === y0 ? ih / 2 : (v - y0) / (y1 - y0) * ih);
    let g = `<line x1="${M.l}" y1="${M.t + ih}" x2="${M.l + iw}" y2="${M.t + ih}" stroke="#333"/>` +
            `<line x1="${M.l}" y1="${M.t}" x2="${M.l}" y2="${M.t + ih}" stroke="#333"/>` +
            `<text x="${M.l + iw / 2}" y="${H - 14}" font-size="11" text-anchor="middle" fill="#333">${esc(xlab)}</text>` +
            `<text x="14" y="${M.t + ih / 2}" font-size="11" text-anchor="middle" fill="#333" transform="rotate(-90 14 ${M.t + ih / 2})">${esc(ylab)}</text>`;
    for (const t of xticks) g += `<line x1="${sx(t)}" y1="${M.t + ih}" x2="${sx(t)}" y2="${M.t + ih + 4}" stroke="#333"/>` +
        `<text x="${sx(t)}" y="${M.t + ih + 17}" font-size="9.5" text-anchor="middle" fill="#444">${esc(fmt(t))}</text>`;
    for (const t of yticks) g += `<line x1="${M.l - 4}" y1="${sy(t)}" x2="${M.l}" y2="${sy(t)}" stroke="#333"/>` +
        `<text x="${M.l - 8}" y="${sy(t) + 3}" font-size="9.5" text-anchor="end" fill="#444">${esc(fmt(t))}</text>`;
    return { g, sx, sy };
};
const ticksFor = (lo, hi, n = 6) => {
    if (lo === hi) return [lo];
    const out = []; for (let i = 0; i <= n; i++) out.push(lo + (hi - lo) * i / n); return out;
};

// ---- V1 histogram of Δ -----------------------------------------------------
function V1(deltas, ph) {
    if (!deltas.length) return frame(`V1 — Δ histogram, phase ${ph}`, 'no data', '');
    const lo = Math.min(...deltas), hi = Math.max(...deltas);
    const bins = 24, w = (hi - lo) / bins || 1;
    const counts = new Array(bins).fill(0);
    for (const d of deltas) counts[Math.min(bins - 1, Math.floor((d - lo) / w))]++;
    const ymax = Math.max(...counts);
    const { g, sx, sy } = axes(lo, hi, 0, ymax, 'Δ(c,p)', 'configurations',
        ticksFor(lo, hi), ticksFor(0, ymax, Math.min(ymax, 5)).map(Math.round));
    let bars = '';
    counts.forEach((c, i) => {
        if (!c) return;
        const x = sx(lo + i * w), x2 = sx(lo + (i + 1) * w);
        bars += `<rect x="${x}" y="${sy(c)}" width="${Math.max(1, x2 - x - 1)}" height="${sy(0) - sy(c)}" fill="#3b6ea5"/>`;
    });
    const zero = (lo <= 0 && hi >= 0) ? `<line x1="${sx(0)}" y1="${M.t}" x2="${sx(0)}" y2="${M.t + ih}" stroke="#c33" stroke-dasharray="4 3"/>` : '';
    return frame(`V1 — Δ(c,p) histogram, phase ${ph}`,
        `N=${deltas.length}. Descriptive; no fitted curve, no error bars.`, g + bars + zero);
}

// ---- V2 ECDF ---------------------------------------------------------------
function V2(deltas, ph) {
    if (!deltas.length) return frame(`V2 — Δ ECDF, phase ${ph}`, 'no data', '');
    const v = deltas.slice().sort((a, b) => a - b);
    const lo = v[0], hi = v[v.length - 1];
    const { g, sx, sy } = axes(lo, hi, 0, 1, 'Δ(c,p)', 'cumulative fraction',
        ticksFor(lo, hi), [0, 0.25, 0.5, 0.75, 1]);
    let pts = '';
    v.forEach((x, i) => { pts += `${sx(x)},${sy((i + 1) / v.length)} `; });
    const zero = (lo <= 0 && hi >= 0) ? `<line x1="${sx(0)}" y1="${M.t}" x2="${sx(0)}" y2="${M.t + ih}" stroke="#c33" stroke-dasharray="4 3"/><text x="${sx(0) + 4}" y="${M.t + 12}" font-size="9.5" fill="#c33">Δ = 0</text>` : '';
    return frame(`V2 — Δ(c,p) ECDF, phase ${ph}`,
        `N=${v.length}. Reference line at 0 per §9.7; no other line is drawn.`,
        g + zero + `<polyline points="${pts}" fill="none" stroke="#3b6ea5" stroke-width="1.6"/>`);
}

// ---- V3 per-configuration dot plot ----------------------------------------
function V3(rows, ph) {
    if (!rows.length) return frame(`V3 — per-configuration Δ, phase ${ph}`, 'no data', '');
    const s = rows.slice().sort((a, b) => a.delta - b.delta);
    const lo = Math.min(...s.map(r => r.delta)), hi = Math.max(...s.map(r => r.delta));
    const { g, sx, sy } = axes(0, s.length - 1, lo, hi, 'configuration (sorted by Δ)', 'Δ(c,p)',
        ticksFor(0, s.length - 1, 5).map(Math.round), ticksFor(lo, hi));
    let dots = '';
    s.forEach((r, i) => { dots += `<circle cx="${sx(i)}" cy="${sy(r.delta)}" r="2.4" fill="#3b6ea5"/>`; });
    const zero = (lo <= 0 && hi >= 0) ? `<line x1="${M.l}" y1="${sy(0)}" x2="${M.l + iw}" y2="${sy(0)}" stroke="#c33" stroke-dasharray="4 3"/>` : '';
    return frame(`V3 — every configuration's Δ, phase ${ph}`,
        `N=${s.length}. Every configuration is shown; no aggregation replaces it (§9.1).`,
        g + zero + dots);
}

// ---- V4 / V5 scatter -------------------------------------------------------
function scatter(rows, xkey, xlab, title, sub, ph) {
    if (!rows.length) return frame(`${title}, phase ${ph}`, 'no data', '');
    const xs = rows.map(r => r[xkey]), ys = rows.map(r => r.delta);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const { g, sx, sy } = axes(x0, x1, y0, y1, xlab, 'Δ(c,p)',
        ticksFor(x0, x1, Math.min(6, Math.max(1, x1 - x0))).map(Math.round), ticksFor(y0, y1));
    let dots = '';
    rows.forEach(r => { dots += `<circle cx="${sx(r[xkey])}" cy="${sy(r.delta)}" r="2.6" fill="#3b6ea5" fill-opacity="0.75"/>`; });
    const zero = (y0 <= 0 && y1 >= 0) ? `<line x1="${M.l}" y1="${sy(0)}" x2="${M.l + iw}" y2="${sy(0)}" stroke="#c33" stroke-dasharray="4 3"/>` : '';
    return frame(`${title}, phase ${ph}`, sub, g + zero + dots);
}

// ---- V6 paired ρ scatter ---------------------------------------------------
function V6(cells, ph) {
    const c = cells.filter(x => x.phase === ph && x.bothDefined);
    if (!c.length) return frame(`V6 — ρ paired scatter, phase ${ph}`, 'no data', '');
    const { g, sx, sy } = axes(0, 1, 0, 1, 'ρ ARMED', 'ρ ABLATED',
        [0, 0.25, 0.5, 0.75, 1], [0, 0.25, 0.5, 0.75, 1]);
    const seen = new Map();
    for (const x of c) { const k = `${x.rhoA.toFixed(3)},${x.rhoB.toFixed(3)}`; seen.set(k, (seen.get(k) || 0) + 1); }
    let dots = '';
    for (const [k, n] of seen) {
        const [a, b] = k.split(',').map(Number);
        dots += `<circle cx="${sx(a)}" cy="${sy(b)}" r="${Math.min(6, 1.6 + Math.sqrt(n))}" fill="#3b6ea5" fill-opacity="0.5"/>`;
    }
    const ident = `<line x1="${sx(0)}" y1="${sy(0)}" x2="${sx(1)}" y2="${sy(1)}" stroke="#c33" stroke-dasharray="4 3"/>`;
    return frame(`V6 — state-level ρ, ARMED vs ABLATED, phase ${ph}`,
        `${c.length} jointly-defined cells. Identity line per §9.7; marker area shows multiplicity.`,
        g + ident + dots);
}

// ---- V7 / V8 overlaid histograms by arm -----------------------------------
function overlaid(histA, histB, xlab, title, sub) {
    const keys = [...new Set([...Object.keys(histA), ...Object.keys(histB)])]
        .map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    if (!keys.length) return frame(title, 'no data', '');
    const ymax = Math.max(...keys.map(k => Math.max(histA[k] || 0, histB[k] || 0)));
    const { g, sx, sy } = axes(keys[0] - 0.5, keys[keys.length - 1] + 0.5, 0, ymax, xlab, 'cells',
        keys, ticksFor(0, ymax, 5).map(Math.round));
    let bars = '';
    const bw = iw / (keys.length * 2.6);
    for (const k of keys) {
        const a = histA[k] || 0, b = histB[k] || 0;
        bars += `<rect x="${sx(k) - bw}" y="${sy(a)}" width="${bw}" height="${sy(0) - sy(a)}" fill="#3b6ea5"/>`;
        bars += `<rect x="${sx(k)}" y="${sy(b)}" width="${bw}" height="${sy(0) - sy(b)}" fill="#c98a3b"/>`;
    }
    const legend = `<rect x="${M.l + iw - 150}" y="${M.t - 2}" width="10" height="10" fill="#3b6ea5"/>` +
        `<text x="${M.l + iw - 136}" y="${M.t + 7}" font-size="10" fill="#333">ARMED</text>` +
        `<rect x="${M.l + iw - 78}" y="${M.t - 2}" width="10" height="10" fill="#c98a3b"/>` +
        `<text x="${M.l + iw - 64}" y="${M.t + 7}" font-size="10" fill="#333">ABLATED</text>`;
    return frame(title, sub, g + bars + legend);
}

// ---------------------------------------------------------------------------
export function renderAll(results) {
    fs.mkdirSync(FIG, { recursive: true });
    const written = [];
    const write = (name, svg) => { fs.writeFileSync(path.join(FIG, name), svg); written.push(name); };
    const valid = results.configurations.filter(c => c.disposition === 'ACCEPTED');
    const allCells = valid.flatMap(c => c.cells || []);

    for (const ph of [1, 2]) {
        const rows = valid.filter(c => c.perPhase?.[ph]?.delta !== null && c.perPhase?.[ph]?.delta !== undefined)
            .map(c => ({
                cfg: `${c.configSeed}:${c.configIndex}`, delta: c.perPhase[ph].delta,
                jointlyDefined: c.perPhase[ph].missingness.jointlyDefined,
                asym: c.perPhase[ph].missingness.asym,
            }));
        const deltas = rows.map(r => r.delta);
        write(`V1_histogram_phase${ph}.svg`, V1(deltas, ph));
        write(`V2_ecdf_phase${ph}.svg`, V2(deltas, ph));
        write(`V3_per_configuration_phase${ph}.svg`, V3(rows, ph));
        write(`V4_delta_vs_jointlyDefined_phase${ph}.svg`, scatter(rows, 'jointlyDefined',
            'jointly defined states', 'V4 — Δ vs jointly-defined count',
            'Scatter only; a fitted line would be an inferential claim (§9.7).', ph));
        write(`V5_delta_vs_asym_phase${ph}.svg`, scatter(rows, 'asym',
            '|missing_A − missing_B|', 'V5 — Δ vs differential definedness',
            'Scatter only; no trend estimate is drawn (§9.7).', ph));
        write(`V6_rho_paired_phase${ph}.svg`, V6(allCells, ph));
        const d = results.perPhase[ph].diagnostics;
        write(`V7_pool_size_phase${ph}.svg`, overlaid(d.poolArmed, d.poolAblated, 'pool size n',
            `V7 — decision-time pool size by arm, phase ${ph}`,
            'The treatment changes pool composition; this shows it directly.'));
        write(`V8_raw_rank_phase${ph}.svg`, overlaid(d.rankArmed, d.rankAblated, 'raw rank r',
            `V8 — raw rank of the oracle-optimal action by arm, phase ${ph}`,
            'Resolution actually attained.'));
    }
    return written;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    const results = JSON.parse(fs.readFileSync(path.join(RES, 'c1_results.json'), 'utf8'));
    const w = renderAll(results);
    console.log(`rendered ${w.length} figures to experiments/c1/results/figures/`);
    for (const n of w) console.log('  ' + n);
}
