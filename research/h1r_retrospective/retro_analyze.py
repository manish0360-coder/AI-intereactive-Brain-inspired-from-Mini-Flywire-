"""H1-R POST-HOC RETROSPECTIVE: descriptive / exploratory analysis (READ-ONLY; NOT confirmatory; H1-R is closed as VOID, D-032).

Reads research/h1r_retrospective/out/*.json (written by retro_extract.mjs from the lodged manifests and raw records) and writes
out/analysis.json, out/summary.txt and figures/*.png. Every statistic here is post hoc. Nothing is a test of H1 and no verdict is retrofitted.
Run from the repository root:  python research/h1r_retrospective/retro_analyze.py
"""
import json, os, sys, itertools
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

try:
    from scipy.stats import spearmanr
    def spearman(x, y):
        r = spearmanr(x, y)[0]
        return None if r != r else float(r)
except Exception:  # numpy fallback (average ranks)
    def _rank(a):
        a = np.asarray(a, float); o = np.argsort(a, kind='mergesort'); r = np.empty(len(a)); r[o] = np.arange(len(a))
        for v in np.unique(a): m = a == v; r[m] = r[m].mean()
        return r
    def spearman(x, y):
        if len(x) < 3: return None
        a, b = _rank(x), _rank(y)
        if a.std() == 0 or b.std() == 0: return None
        return float(np.corrcoef(a, b)[0, 1])

ROOT = 'research/h1r_retrospective'; OUT = f'{ROOT}/out'; FIG = f'{ROOT}/figures'; os.makedirs(FIG, exist_ok=True)
J = lambda n: json.load(open(f'{OUT}/{n}'))
runs, tpairs, cells, cfgs, crossed = J('run_metrics.json'), J('trust_pairs.json'), J('cells_pairwise.json'), J('config_tables.json'), J('crossed.json')
ARMS = [f'A{i}' for i in range(1, 8)]; SEEDS = [20260819004 + i for i in range(5)]; WIN = ['W1', 'W2', 'W3', 'W4']
WSIZE = {'W1': 300, 'W2': 1200, 'W3': 300, 'W4': 1200}
NAMES = {'A1': 'BELIEF', 'A2': 'ABLATION', 'A3': 'RANDOM', 'A4': 'FROZEN', 'A5': 'AGG-ONLY', 'A6': 'SHUFFLED', 'A7': 'ORACLE'}
COL = {'A1': '#1f77b4', 'A2': '#7f7f7f', 'A3': '#d62728', 'A4': '#2ca02c', 'A5': '#9467bd', 'A6': '#ff7f0e', 'A7': '#17becf'}
idx = {(r['arm'], r['c'], r['s']): r for r in runs}
num = lambda v: (np.nan if v is None else (np.inf if v == 'Infinity' else float(v)))

def G(arm, f):
    g = np.full((10, 5), np.nan)
    for c in range(10):
        for j, s in enumerate(SEEDS): g[c, j] = f(idx[(arm, c, s)])
    return g
Rw = {a: {w: G(a, lambda r, w=w: r['R'][w]) for w in WIN} for a in ARMS}
Rw_all = {a: G(a, lambda r: r['R_all']) for a in ARMS}
for a in ARMS: Rw[a]['R_all'] = Rw_all[a]
GR = {a: {w: G(a, lambda r, w=w: r['goalRate'][w]) for w in WIN} for a in ARMS}
res = {}
S = []   # text summary lines
def say(*a):
    line = ' '.join(str(x) for x in a); S.append(line); print(line)
f2 = lambda x: 'nan' if x is None or (isinstance(x, float) and x != x) else (f'{x:.2f}' if abs(x) < 1e5 else f'{x:.3g}')

# ---------------------------------------------------------------- 1. inventory
M1 = json.load(open('experiments/h1r/stage_records/stage1_manifest.json')); ME = json.load(open('experiments/h1r/stage_records/extension_manifest.json'))
inv = {}
for name, M in (('stage1', M1), ('extension', ME)):
    base = [r for r in M['runs'] if r['role'] == 'base']; det = [r for r in M['runs'] if r['role'] == 'determinism']
    inv[name] = dict(runs=len(M['runs']), base=len(base), determinism=len(det), configIndices=sorted({r['identity']['configIndex'] for r in base}), agentSeeds=sorted({r['identity']['agentSeed'] for r in base}),
                     arms=sorted({r['identity']['arm'] for r in base}), cells=len({(r['identity']['configIndex'], r['identity']['agentSeed']) for r in base}), counts={k: M['counts'][k] for k in ('planned', 'valid', 'invalid', 'noRecord')})
res['inventory'] = inv; res['configs'] = [{k: v for k, v in c.items() if k != 'edges'} for c in cfgs]
say('== INVENTORY'); [say(k, json.dumps(v)) for k, v in inv.items()]
say('configs (index: configSeed->acceptedSeed goal | nEdges meanP_I meanP_II meanAbsShift rho(phases))')
for c in cfgs: say(f"  {c['configIndex']}: {c['configSeed']}->{c['acceptedSeed']} goal {c['goal']} | {c['nEdges']} {c['meanPI']:.3f} {c['meanPII']:.3f} {c['meanAbsShift']:.3f} {f2(c['rhoPhases'])}")

# ---------------------------------------------------------------- 2. F-11 reconstruction summary (numbers from the frozen code, see retro_extract.mjs)
def X(contrast, window, scope): return next(r for r in crossed if r['contrast'] == contrast and r['window'] == window and r['scope'] == scope)
res['F11'] = {s: {w: {k: X('A7-A2', w, s)[k] for k in ('computable', 'C', 'S', 'nu', 'dbar', 'se', 'lower', 'upper', 'containsZero', 'MS_C', 'MS_S', 'MS_CS', 'tPrime', 'p', 'components')} for w in ('W1', 'W3')} for s in ('stage1', 'extension', 'pooled')}
say('\n== F-11 (A7 - A2, frozen crossed test, 99% CI) by scope')
for s in ('stage1', 'extension', 'pooled'):
    for w in ('W1', 'W3'):
        x = X('A7-A2', w, s); hw = (x['upper'] - x['lower']) / 2
        say(f"  {s:9s} {w}: dbar {x['dbar']:8.2f} se {x['se']:7.2f} CI [{x['lower']:8.2f}, {x['upper']:8.2f}] half-width {hw:6.2f} containsZero {x['containsZero']} | MS_C {x['MS_C']:.0f} MS_S {x['MS_S']:.0f} MS_CS {x['MS_CS']:.0f} | share of se^2 from configs {x['MS_C'] / (x['MS_C'] + x['MS_S']):.2f}")

# ---------------------------------------------------------------- 3. effect map
def eff(d):
    flat = d.flatten(); cm, sm = d.mean(1), d.mean(0)
    return dict(mean=float(flat.mean()), median=float(np.median(flat)), q1=float(np.percentile(flat, 25)), q3=float(np.percentile(flat, 75)), min=float(flat.min()), max=float(flat.max()),
                npos=int((flat > 0).sum()), nneg=int((flat < 0).sum()), nzero=int((flat == 0).sum()), sd=float(flat.std(ddof=1)), dz=float(flat.mean() / flat.std(ddof=1)) if flat.std(ddof=1) > 0 else None,
                cfg_means=[float(v) for v in cm], cfg_pos=int((cm > 0).sum()), cfg_sd=float(cm.std(ddof=1)), seed_means=[float(v) for v in sm], seed_pos=int((sm > 0).sum()), seed_sd=float(sm.std(ddof=1)),
                stage1_mean=float(d[:5].mean()), ext_mean=float(d[5:].mean()))
rng = np.random.default_rng(20261006)
def boot(d, B=10000):
    m = np.empty(B)
    for b in range(B): m[b] = d[np.ix_(rng.integers(0, 10, 10), rng.integers(0, 5, 5))].mean()
    return [float(np.percentile(m, 2.5)), float(np.percentile(m, 97.5))]
CON = [('A1', 'A2'), ('A1', 'A3'), ('A1', 'A4'), ('A1', 'A5'), ('A1', 'A6'), ('A1', 'A7'), ('A7', 'A2'), ('A2', 'A5'), ('A4', 'A2')]
EM = {}
for x, y in CON:
    for w in WIN + ['R_all']:
        d = Rw[x][w] - Rw[y][w]; e = eff(d); e['boot95_exploratory'] = boot(d) ; e['crossed99_pooled'] = {k: X(f'{x}-{y}', w, 'pooled')[k] for k in ('dbar', 'se', 'lower', 'upper', 'containsZero')} if any(r['contrast'] == f'{x}-{y}' for r in crossed) else None
        EM[f'{x}-{y}|{w}'] = e
res['effect_map'] = EM
say('\n== EFFECT MAP (descriptive; reward per 100 ticks; difference = first minus second arm; 50 cells = 10 configs x 5 seeds)')
say('contrast  win   mean   median [q1,q3]        min..max          +/-/0   cfg(+/10) seed(+/5)  dz   boot95(expl)  | frozen crossed 99% CI (post hoc)')
for x, y in CON[:7]:
    for w in WIN:
        e = EM[f'{x}-{y}|{w}']; c = e['crossed99_pooled']
        say(f"{x}-{y}   {w}  {e['mean']:7.2f} {e['median']:7.2f} [{e['q1']:7.2f},{e['q3']:7.2f}] {e['min']:7.1f}..{e['max']:6.1f}  {e['npos']:2d}/{e['nneg']:2d}/{e['nzero']:2d}  {e['cfg_pos']:2d}/10  {e['seed_pos']}/5  {f2(e['dz']):>5s}  [{e['boot95_exploratory'][0]:7.1f},{e['boot95_exploratory'][1]:7.1f}] | [{c['lower']:7.1f},{c['upper']:7.1f}] {'contains0' if c['containsZero'] else 'EXCLUDES0'}")
say('R_all (30 windows-equivalent):')
for x, y in CON:
    e = EM[f'{x}-{y}|R_all']; c = e['crossed99_pooled']
    cs = f"crossed99 [{c['lower']:.1f},{c['upper']:.1f}]" if c else 'crossed99 not computed for this contrast'
    say(f"  {x}-{y}: mean {e['mean']:7.2f} median {e['median']:7.2f} +/-/0 {e['npos']}/{e['nneg']}/{e['nzero']} cfg+ {e['cfg_pos']}/10 stage1 {e['stage1_mean']:6.2f} ext {e['ext_mean']:6.2f} boot95 [{e['boot95_exploratory'][0]:.1f},{e['boot95_exploratory'][1]:.1f}] {cs}")

# ---------------------------------------------------------------- 4. cell stability (A1-A2 and A7-A2)
def stab(x, y, w):
    d = Rw[x][w] - Rw[y][w]; flat = np.abs(d).flatten(); top5 = np.sort(flat)[::-1][:5].sum() / flat.sum()
    loo_c = [float(np.delete(d, c, 0).mean()) for c in range(10)]; loo_s = [float(np.delete(d, j, 1).mean()) for j in range(5)]
    rev_c = int(((d.mean(1) > 0) != (d.mean() > 0)).sum()); rev_s = int(((d.mean(0) > 0) != (d.mean() > 0)).sum())
    # within-config sign consistency across seeds
    wcs = [int(max((d[c] > 0).sum(), (d[c] < 0).sum())) for c in range(10)]
    return dict(matrix=d.tolist(), top5_share_abs=float(top5), loo_config_range=[min(loo_c), max(loo_c)], loo_seed_range=[min(loo_s), max(loo_s)], config_reversals=rev_c, seed_reversals=rev_s, within_config_majority_seeds=wcs)
res['stability'] = {f'{x}-{y}|{w}': stab(x, y, w) for (x, y) in (('A1', 'A2'), ('A7', 'A2'), ('A1', 'A4')) for w in ('W1', 'W3', 'R_all')}
say('\n== CELL STABILITY (config x seed matrices are in analysis.json / fig1)')
for k, v in res['stability'].items(): say(f"  {k}: top-5 cells carry {v['top5_share_abs']:.2f} of sum|d|; leave-one-config-out mean range [{v['loo_config_range'][0]:.1f},{v['loo_config_range'][1]:.1f}]; leave-one-seed-out [{v['loo_seed_range'][0]:.1f},{v['loo_seed_range'][1]:.1f}]; configs whose mean sign differs from the overall {v['config_reversals']}/10; seeds {v['seed_reversals']}/5; per-config majority sign count {v['within_config_majority_seeds']}")
# noise floor: arms that should behave alike (A2 vs A5: same per-edge trust 0.5, differ only in the aggregate)
nf = {w: eff(Rw['A2'][w] - Rw['A5'][w]) for w in WIN + ['R_all']}
res['noise_floor_A2_vs_A5'] = {w: {k: nf[w][k] for k in ('mean', 'sd', 'npos', 'nneg', 'nzero', 'median', 'q1', 'q3')} for w in nf}
say('noise floor, A2 - A5 (arms that differ only in the aggregate): ' + '; '.join(f"{w}: sd {nf[w]['sd']:.1f} (+/-/0 {nf[w]['npos']}/{nf[w]['nneg']}/{nf[w]['nzero']})" for w in WIN))
say('same for A1 - A2: ' + '; '.join(f"{w}: sd {EM['A1-A2|' + w]['sd']:.1f}" for w in WIN) + ' | A7 - A2: ' + '; '.join(f"{w}: sd {EM['A7-A2|' + w]['sd']:.1f}" for w in WIN))

# ---------------------------------------------------------------- 5. temporal dynamics
bins = {a: np.array([[idx[(a, c, s)]['extras']['rewardBins'] for s in SEEDS] for c in range(10)]) for a in ARMS}   # 10 x 5 x 30
tl = {a: dict(mean=bins[a].mean((0, 1)).tolist(), cluster_se=(bins[a].mean(1).std(0, ddof=1) / np.sqrt(10)).tolist()) for a in ARMS}
res['timecourse'] = tl
shift = {}
for a in ARMS:
    d32 = Rw[a]['W3'] - Rw[a]['W2']; d42 = Rw[a]['W4'] - Rw[a]['W2']; g32 = GR[a]['W3'] - GR[a]['W2']
    shift[a] = dict(W3_minus_W2=eff(d32), W4_minus_W2=eff(d42), goalrate_W3_minus_W2_mean=float(g32.mean()), R_means={w: float(Rw[a][w].mean()) for w in WIN}, goal_means={w: float(GR[a][w].mean()) for w in WIN})
res['shift_response'] = {a: {k: (v if not isinstance(v, dict) or 'mean' not in v else {kk: v[kk] for kk in ('mean', 'median', 'npos', 'nneg', 'q1', 'q3', 'cfg_pos')}) for k, v in shift[a].items()} for a in ARMS}
hl = {a: dict(median=float(np.median([idx[(a, c, s)]['halfLife']['value'] for c in range(10) for s in SEEDS])), censored=int(sum(idx[(a, c, s)]['halfLife']['censored'] for c in range(10) for s in SEEDS)), zero=int(sum(idx[(a, c, s)]['halfLife']['value'] == 0 for c in range(10) for s in SEEDS))) for a in ARMS}
res['halflife'] = hl
say('\n== TEMPORAL (reward per 100 ticks; mean over 50 cells)')
say('arm   ' + ' '.join(f'{w:>8s}' for w in WIN) + '   W3-W2 (mean; cells down/up; configs down)   W4-W2   goal/100: ' + ' '.join(WIN) + '   half-life median / censored / zero')
for a in ARMS:
    s = shift[a]; e32, e42 = s['W3_minus_W2'], s['W4_minus_W2']
    say(f"{a} {NAMES[a]:8s} " + ' '.join(f"{s['R_means'][w]:8.1f}" for w in WIN) + f"   {e32['mean']:7.1f}; {e32['nneg']}/{e32['npos']}; {10 - e32['cfg_pos']}/10   {e42['mean']:7.1f}   " + ' '.join(f"{s['goal_means'][w]:5.2f}" for w in WIN) + f"   {hl[a]['median']:.0f} / {hl[a]['censored']} / {hl[a]['zero']}")
# difference-in-differences (descriptive): shift response of A1 relative to A2 / A4 / A7
did = {}
for y in ('A2', 'A4', 'A7'):
    d = (Rw['A1']['W3'] - Rw['A1']['W2']) - (Rw[y]['W3'] - Rw[y]['W2']); e = eff(d); did[f'A1-{y}'] = {k: e[k] for k in ('mean', 'median', 'npos', 'nneg', 'cfg_pos', 'sd')}
res['shift_did'] = did; say('shift response A1 relative to others ((W3-W2)_A1 - (W3-W2)_y): ' + '; '.join(f"vs {y}: mean {v['mean']:.1f}, +/- {v['npos']}/{v['nneg']}" for y, v in ((k[3:], v) for k, v in did.items())))
# does the size of the configured reliability change line up with the change in reward? (n = 10 configurations; very low resolution)
cfg_shift = np.array([c['meanAbsShift'] for c in cfgs]); cfg_dshift = np.array([c['meanShift'] for c in cfgs])
res['shift_vs_config'] = {a: dict(spearman_absShift_vs_dR=spearman(cfg_shift, (Rw[a]['W3'] - Rw[a]['W2']).mean(1)), spearman_meanShift_vs_dR=spearman(cfg_dshift, (Rw[a]['W3'] - Rw[a]['W2']).mean(1))) for a in ARMS}
say(f"configured reliability change per config: meanAbsShift {np.round(cfg_shift, 3).tolist()} | meanShift {np.round(cfg_dshift, 3).tolist()}")
say('Spearman across 10 configs, mean |p shift| vs change in reward W3-W2: ' + '; '.join(f"{a} {f2(res['shift_vs_config'][a]['spearman_absShift_vs_dR'])}" for a in ARMS))
# slip, learning, exploration by window
def agg(arm, f): return np.array([[f(idx[(arm, c, s)]) for s in SEEDS] for c in range(10)])
slip = {a: {w: float(np.nanmean(agg(a, lambda r, w=w: np.nan if r['slip'][w]['nonGoal'] is None else r['slip'][w]['nonGoal']))) for w in WIN} for a in ARMS}
upd = {a: {w: float(agg(a, lambda r, w=w: r['link1']['nUpdates'][w]).mean()) for w in WIN} for a in ARMS}
res['slip_nonGoal_by_window'] = slip; res['trust_updates_by_window'] = upd
say('\nnon-goal slip rate by window: ' + ' | '.join(f"{a}: " + '/'.join(f'{slip[a][w]:.3f}' for w in WIN) for a in ARMS))
say('trust-attempt increments per window: ' + ' | '.join(f"{a}: " + '/'.join(f'{upd[a][w]:.0f}' for w in WIN) for a in ARMS))

# ---------------------------------------------------------------- 6. trust / reliability
tp = {a: {'tau1499': [], 'tau2999': []} for a in ARMS}
for t in tpairs:
    for lab in ('tau1499', 'tau2999'): tp[t['arm']][lab].extend([(k[0], k[1], k[2], k[3], t['c'], t['s']) for k in t['pairs'][lab]])
def rho_stats(arm, lab):
    v = [idx[(arm, c, s)]['calibration'][lab]['rho'] for c in range(10) for s in SEEDS]; und = sum(x is None for x in v); v = np.array([x for x in v if x is not None], float)
    return dict(n_defined=int(len(v)), n_undefined=int(und), mean=float(v.mean()) if len(v) else None, median=float(np.median(v)) if len(v) else None, q1=float(np.percentile(v, 25)) if len(v) else None, q3=float(np.percentile(v, 75)) if len(v) else None, npos=int((v > 0).sum()), nneg=int((v < 0).sum()))
rho = {a: {lab: rho_stats(a, lab) for lab in ('tau1499', 'tau2999')} for a in ARMS}; res['rho_run'] = rho
say('\n== TRUST vs CONFIGURED RELIABILITY (frozen rho_run = Spearman over keys with >=5 raw attempts; undirected p of the phase)')
for a in ARMS: say(f"  {a}: tau1499 mean {f2(rho[a]['tau1499']['mean'])} median {f2(rho[a]['tau1499']['median'])} [{f2(rho[a]['tau1499']['q1'])},{f2(rho[a]['tau1499']['q3'])}] +/- {rho[a]['tau1499']['npos']}/{rho[a]['tau1499']['nneg']} undefined {rho[a]['tau1499']['n_undefined']} | tau2999 mean {f2(rho[a]['tau2999']['mean'])} median {f2(rho[a]['tau2999']['median'])} +/- {rho[a]['tau2999']['npos']}/{rho[a]['tau2999']['nneg']} undefined {rho[a]['tau2999']['n_undefined']}")
rho_cfg = {lab: [float(np.nanmean([num(idx[('A1', c, s)]['calibration'][lab]['rho']) for s in SEEDS])) for c in range(10)] for lab in ('tau1499', 'tau2999')}
rho_seed = {lab: [float(np.nanmean([num(idx[('A1', c, s)]['calibration'][lab]['rho']) for c in range(10)])) for s in SEEDS] for lab in ('tau1499', 'tau2999')}
res['rho_A1_by_config'] = rho_cfg; res['rho_A1_by_seed'] = rho_seed
say('  A1 mean rho by config (1499): ' + ' '.join(f'{v:.2f}' for v in rho_cfg['tau1499']) + ' | by seed: ' + ' '.join(f'{v:.2f}' for v in rho_seed['tau1499']))
say('  A1 mean rho by config (2999): ' + ' '.join(f'{v:.2f}' for v in rho_cfg['tau2999']) + ' | by seed: ' + ' '.join(f'{v:.2f}' for v in rho_seed['tau2999']))
def calib(arm, lab, which):   # which: index of p in the tuple (1 = phase I, 2 = phase II)
    ks = [k for k in tp[arm][lab] if k[3] >= 5]; t = np.array([k[0] for k in ks]); p = np.array([k[which] for k in ks])
    b = np.minimum(9, np.floor(10 * t)).astype(int)
    return dict(n=len(ks), bins=[dict(bin=i, n=int((b == i).sum()), meanTrust=float(t[b == i].mean()) if (b == i).any() else None, meanP=float(p[b == i].mean()) if (b == i).any() else None) for i in range(10)], pearson=float(np.corrcoef(t, p)[0, 1]) if len(ks) > 2 and t.std() > 0 and p.std() > 0 else None,
                meanTrust=float(t.mean()), meanP=float(p.mean()), mae=float(np.abs(t - p).mean()), spearman_pooled=spearman(t, p))
CAL = {a: {'tau1499_vs_pI': calib(a, 'tau1499', 1), 'tau2999_vs_pII': calib(a, 'tau2999', 2), 'tau2999_vs_pI(stale)': calib(a, 'tau2999', 1)} for a in ARMS}; res['calibration'] = CAL
say('  pooled keys (>=5 raw): n, mean trust, mean p, pooled Pearson, MAE   [tau1499 vs phase-I p | tau2999 vs phase-II p | tau2999 vs phase-I p (stale)]')
for a in ARMS: say(f"  {a}: " + ' | '.join(f"{CAL[a][k]['n']:4d} {CAL[a][k]['meanTrust']:.3f} {CAL[a][k]['meanP']:.3f} {f2(CAL[a][k]['pearson'])} {CAL[a][k]['mae']:.3f}" for k in CAL[a]))
allp1 = np.array([k[1] for a in ARMS for k in tp[a]['tau1499'] if k[3] >= 5]); allp2 = np.array([k[2] for a in ARMS for k in tp[a]['tau2999'] if k[3] >= 5])
lo1, hi1, lo2, hi2 = np.percentile(allp1, 33.3), np.percentile(allp1, 66.7), np.percentile(allp2, 33.3), np.percentile(allp2, 66.7)
def regions(arm, lab, which, lo, hi):
    ks = [k for k in tp[arm][lab] if k[3] >= 5]; n = max(1, len(ks))
    over = sum(1 for k in ks if k[0] >= 0.6 and k[which] <= lo); under = sum(1 for k in ks if k[0] <= 0.4 and k[which] >= hi)
    return dict(n=len(ks), overtrust_frac=over / n, undertrust_frac=under / n, p_cut=[float(lo), float(hi)])
REG = {a: {'tau1499': regions(a, 'tau1499', 1, lo1, hi1), 'tau2999': regions(a, 'tau2999', 2, lo2, hi2)} for a in ARMS}; res['trust_regions'] = REG
say(f"  regions (descriptive thresholds: overtrust = trust>=0.6 and p in lowest third (<= {lo1:.3f}/{lo2:.3f}); undertrust = trust<=0.4 and p in highest third (>= {hi1:.3f}/{hi2:.3f})): " + ' | '.join(f"{a}: over {REG[a]['tau1499']['overtrust_frac']:.2f}/{REG[a]['tau2999']['overtrust_frac']:.2f} under {REG[a]['tau1499']['undertrust_frac']:.2f}/{REG[a]['tau2999']['undertrust_frac']:.2f}" for a in ARMS))
# does prior trust predict realised success? (AUC) and Brier relative to the prequential base rate, by phase
PH = {}
for a in ARMS:
    PH[a] = {}
    for ph in ('I', 'II'):
        au = np.array([num(idx[(a, c, s)]['extras']['phaseTrust'][ph]['auc']) for c in range(10) for s in SEEDS]); bt = np.array([idx[(a, c, s)]['extras']['phaseTrust'][ph]['brierTrust'] - idx[(a, c, s)]['extras']['phaseTrust'][ph]['brierBase'] for c in range(10) for s in SEEDS])
        PH[a][ph] = dict(auc_mean=float(np.nanmean(au)), auc_gt_half=int((au > 0.5).sum()), brier_trust_minus_base_mean=float(bt.mean()), brier_better_cells=int((bt < 0).sum()))
res['trust_predicts_success'] = PH
say('  prior trust as a predictor of the realised attempt outcome: AUC mean (cells with AUC>0.5 of 50) and Brier(trust)-Brier(base) mean (cells where trust beats the base rate)')
for a in ARMS: say(f"  {a}: phase I AUC {PH[a]['I']['auc_mean']:.3f} ({PH[a]['I']['auc_gt_half']}/50) dBrier {PH[a]['I']['brier_trust_minus_base_mean']:+.4f} ({PH[a]['I']['brier_better_cells']}/50) | phase II AUC {PH[a]['II']['auc_mean']:.3f} ({PH[a]['II']['auc_gt_half']}/50) dBrier {PH[a]['II']['brier_trust_minus_base_mean']:+.4f} ({PH[a]['II']['brier_better_cells']}/50)")
TS = {}
for a in ARMS:
    TS[a] = {}
    for ph in ('I', 'II'):
        t = {k: {'n': sum(idx[(a, c, s)]['extras']['trustStep'][ph][k]['n'] for c in range(10) for s in SEEDS), 'sum': sum(idx[(a, c, s)]['extras']['trustStep'][ph][k]['sum'] for c in range(10) for s in SEEDS), 'dir': sum(idx[(a, c, s)]['extras']['trustStep'][ph][k]['pos' if k == 'succ' else 'neg'] for c in range(10) for s in SEEDS)} for k in ('succ', 'slip')}
        TS[a][ph] = {k: dict(n=v['n'], mean_change=v['sum'] / v['n'] if v['n'] else None, frac_direction_expected=v['dir'] / v['n'] if v['n'] else None) for k, v in t.items()}
res['trust_after_outcome'] = TS
say('  trust change from an attempt to the same key\'s next attempt (net of any credit updates in between), by that attempt\'s outcome: mean change [fraction moving the expected way]')
for a in ARMS: say(f"  {a}: I success {TS[a]['I']['succ']['mean_change']:+.4f} [{TS[a]['I']['succ']['frac_direction_expected']:.2f}] slip {TS[a]['I']['slip']['mean_change']:+.4f} [{TS[a]['I']['slip']['frac_direction_expected']:.2f}] | II success {TS[a]['II']['succ']['mean_change']:+.4f} [{TS[a]['II']['succ']['frac_direction_expected']:.2f}] slip {TS[a]['II']['slip']['mean_change']:+.4f} [{TS[a]['II']['slip']['frac_direction_expected']:.2f}]")

# ---------------------------------------------------------------- 7. decision mechanism (link 3: shadow trust-term flip)
FL = {}
for a in ARMS:
    fr = agg(a, lambda r: np.nan if r['link3'] is None else num(r['link3']['FR'])); dt = agg(a, lambda r: np.nan if r['link3'] is None else r['link3']['decisionTicks']); rp = agg(a, lambda r: np.nan if r['link3'] is None else r['link3']['replayTicks'])
    byw = {w: float(np.nanmean(agg(a, lambda r, w=w: np.nan if r['link3'] is None or not r['link3']['byWindow'][w]['decisionTicks'] else r['link3']['byWindow'][w]['flips'] / r['link3']['byWindow'][w]['decisionTicks']))) for w in WIN}
    ntt = {w: float(np.mean([idx[(a, c, s)]['extras']['byWin'][w]['nTTnonzero'] / max(1, idx[(a, c, s)]['extras']['byWin'][w]['dec']) for c in range(10) for s in SEEDS])) for w in WIN}
    mxtt = {w: float(np.mean([idx[(a, c, s)]['extras']['byWin'][w]['sumMaxAbsTT'] / max(1, idx[(a, c, s)]['extras']['byWin'][w]['dec']) for c in range(10) for s in SEEDS])) for w in WIN}
    mar = {w: float(np.mean([idx[(a, c, s)]['extras']['byWin'][w]['sumMargin'] / max(1, idx[(a, c, s)]['extras']['byWin'][w]['nMargin']) for c in range(10) for s in SEEDS])) for w in WIN}
    expl = {w: float(np.mean([idx[(a, c, s)]['extras']['byWin'][w]['nExplore'] / max(1, idx[(a, c, s)]['extras']['byWin'][w]['nExploreDen']) for c in range(10) for s in SEEDS])) for w in WIN}
    FL[a] = dict(FR_mean=float(np.nanmean(fr)), FR_median=float(np.nanmedian(fr)), FR_min=float(np.nanmin(fr)), FR_max=float(np.nanmax(fr)), flips_mean=float(np.nanmean(agg(a, lambda r: np.nan if r['link3'] is None else r['link3']['flips']))), decisions_mean=float(np.nanmean(dt)), replay_mean=float(np.nanmean(rp)), flip_rate_by_window=byw,
                 frac_decisions_with_nonzero_trust_term=ntt, mean_max_abs_trust_term=mxtt, mean_top2_margin=mar, executed_differs_from_argmax_rate=expl, cells_with_zero_flips=int(np.nansum(agg(a, lambda r: np.nan if r['link3'] is None else float(r['link3']['flips'] == 0)))))
res['decision_mechanism'] = FL
say('\n== DECISION MECHANISM (frozen link-3 definition: flip = argmax changes when the delivered trust T is replaced by 0.5; applied to every arm; A2/A5 deliver 0.5, so 0 is by construction)')
say('arm  FR mean (min..max) | flips/run | decisions/run | replay ticks/run | flip rate per decision tick by window W1..W4 | cells with 0 flips')
for a in ARMS: f = FL[a]; say(f"{a}  {f['FR_mean']:.4f} ({f['FR_min']:.4f}..{f['FR_max']:.4f}) | {f['flips_mean']:.1f} | {f['decisions_mean']:.0f} | {f['replay_mean']:.0f} | " + '/'.join(f"{f['flip_rate_by_window'][w]:.4f}" for w in WIN) + f" | {f['cells_with_zero_flips']}")
say('trust-term scale vs the score margin (mean over decision ticks, W1..W4): ' + ' || '.join(f"{a}: max|trust term| " + '/'.join(f"{FL[a]['mean_max_abs_trust_term'][w]:.2f}" for w in WIN) + ' margin ' + '/'.join(f"{FL[a]['mean_top2_margin'][w]:.2f}" for w in WIN) + ' nonzero ' + '/'.join(f"{FL[a]['frac_decisions_with_nonzero_trust_term'][w]:.2f}" for w in WIN) for a in ('A1', 'A7')))
say('executed action differs from the stable argmax (exploration / random selection), by window W1..W4: ' + ' | '.join(f"{a}: " + '/'.join(f"{FL[a]['executed_differs_from_argmax_rate'][w]:.3f}" for w in WIN) for a in ARMS))
mono = [x['mono'] for x in runs if x['arm'] == 'A1' and x['mono']]
res['A1_monotonicity_sample'] = mono[:3]
# first flip tick vs the first tick at which A1's executed attempts differ from A2's
rel = [];
for cell in cells:
    c, s = cell['c'], cell['s']; ft = idx[('A1', c, s)]['link3']['flipTaus']; ff = min(ft) if ft else None; dv = cell['pairs']['A1|A2']['divAttempts']; rel.append((c, s, ff, dv, cell['pairs']['A1|A2']['fpEqual']))
cnt = dict(both_none=0, equal=0, divergence_earlier=0, divergence_later=0, flip_only=0, divergence_only=0)
for c, s, ff, dv, fp in rel:
    if ff is None and dv is None: cnt['both_none'] += 1
    elif ff is None: cnt['divergence_only'] += 1
    elif dv is None: cnt['flip_only'] += 1
    elif dv == ff: cnt['equal'] += 1
    elif dv < ff: cnt['divergence_earlier'] += 1
    else: cnt['divergence_later'] += 1
res['firstflip_vs_divergence_A1_A2'] = dict(counts=cnt, first_flip_tau=[r[2] for r in rel], first_div_tau=[r[3] for r in rel], fp_equal_cells=sum(1 for r in rel if r[4]))
dv = np.array([r[3] for r in rel if r[3] is not None], float); ffv = np.array([r[2] for r in rel if r[2] is not None], float)
say(f"A1 vs A2 per cell: fingerprints identical in {sum(1 for r in rel if r[4])}/50 cells; first tick at which executed attempts differ: median {np.median(dv):.0f} (min {dv.min():.0f}, max {dv.max():.0f}); first flip tick (A1): median {np.median(ffv):.0f}; relation of divergence to first flip: {cnt}")

# ---------------------------------------------------------------- 8. learning
LN = {}
for a in ARMS:
    cov = {lab: float(np.nanmean(agg(a, lambda r, lab=lab: np.nan if r['link1']['coverage'][lab]['fraction'] is None else r['link1']['coverage'][lab]['fraction']))) for lab in ('tau1499', 'tau2999')}
    ent = {lab: float(np.nanmean(agg(a, lambda r, lab=lab: np.nan if r['link1']['entropy'][lab]['bits'] is None else r['link1']['entropy'][lab]['bits']))) for lab in ('tau1499', 'tau2999')}
    km = agg(a, lambda r: num(r['stepsToGoal']['median'])); te = {w: float(np.nanmean(agg(a, lambda r, w=w: np.nan if r['trajectoryEntropy'][w]['bits'] is None else r['trajectoryEntropy'][w]['bits']))) for w in WIN}
    dk = {w: float(agg(a, lambda r, w=w: r['extras']['byWin'][w]['distinctKeys'] / WSIZE[w] * 100).mean()) for w in WIN}
    LN[a] = dict(coverage=cov, trust_entropy_bits=ent, km_median_median=float(np.median(km[np.isfinite(km)])) if np.isfinite(km).any() else None, km_inf_runs=int((~np.isfinite(km)).sum()), goal_resets_mean=float(agg(a, lambda r: r['stepsToGoal']['nGoal']).mean()), cap_resets_mean=float(agg(a, lambda r: r['stepsToGoal']['nCap']).mean()),
                 traj_entropy=te, distinct_keys_per_100_ticks=dk, brier_diff_mean=float(agg(a, lambda r: num(r['brier']['difference'])).mean()), floor_calls_mean=float(agg(a, lambda r: r['counts']['floorCalls']).mean()))
res['learning'] = LN
say('\n== LEARNING / EXPLORATION')
say('arm  coverage(>=3 attempts) 1499/2999 | trust entropy bits 1499/2999 | KM steps-to-goal median of run medians (runs with inf) | goal resets/cap resets per run | trajectory entropy W1..W4 | distinct keys per 100 ticks W1..W4 | Brier(trust)-Brier(base) | floor calls')
for a in ARMS: l = LN[a]; say(f"{a}  {l['coverage']['tau1499']:.2f}/{l['coverage']['tau2999']:.2f} | {l['trust_entropy_bits']['tau1499']:.2f}/{l['trust_entropy_bits']['tau2999']:.2f} | {l['km_median_median']} ({l['km_inf_runs']}) | {l['goal_resets_mean']:.1f}/{l['cap_resets_mean']:.1f} | " + '/'.join(f"{l['traj_entropy'][w]:.2f}" for w in WIN) + ' | ' + '/'.join(f"{l['distinct_keys_per_100_ticks'][w]:.1f}" for w in WIN) + f" | {l['brier_diff_mean']:+.4f} | {l['floor_calls_mean']:.0f}")
for (x, y) in (('A4', 'A1'), ('A4', 'A2')):
    say(f"  {x} (Q- and trust-frozen) minus {y}: " + '; '.join(f"{w}: mean {EM[f'{y}-{x}|{w}']['mean'] * -1:.1f} (+{EM[f'{y}-{x}|{w}']['nneg']}/-{EM[f'{y}-{x}|{w}']['npos']} cells)" if f'{y}-{x}|{w}' in EM else f"{w}: {(Rw[x][w] - Rw[y][w]).mean():.1f} (+{int(((Rw[x][w] - Rw[y][w]) > 0).sum())}/-{int(((Rw[x][w] - Rw[y][w]) < 0).sum())} cells)" for w in WIN))

# ---------------------------------------------------------------- 9. arm separation
fpm = np.zeros((7, 7)); sep = {}
for i, a in enumerate(ARMS):
    for j, b in enumerate(ARMS):
        if i == j: fpm[i, j] = 1; continue
        k = f'{a}|{b}' if i < j else f'{b}|{a}'; fpm[i, j] = np.mean([cell['pairs'][k]['fpEqual'] for cell in cells])
divs = {f'{a}|{b}': [cell['pairs'][f'{a}|{b}']['divAttempts'] for cell in cells] for a, b in itertools.combinations(ARMS, 2)}
for a, b in itertools.combinations(ARMS, 2):
    d = Rw[a]['R_all'] - Rw[b]['R_all']; e = eff(d); dv = [v for v in divs[f'{a}|{b}'] if v is not None]
    sep[f'{a}|{b}'] = dict(R_all_mean=e['mean'], sign_consistency=max(e['npos'], e['nneg']) / 50, dz=e['dz'], fp_equal_frac=float(fpm[ARMS.index(a), ARMS.index(b)]), first_div_median=float(np.median(dv)) if dv else None, no_divergence_cells=int(sum(v is None for v in divs[f'{a}|{b}'])))
res['arm_separation'] = sep; res['fingerprint_equal_matrix'] = fpm.tolist()
def label(v):
    if v['fp_equal_frac'] >= 0.9: return 'effectively indistinguishable'
    if v['sign_consistency'] >= 0.7 and abs(v['dz'] or 0) >= 0.5: return 'separated'
    return 'overlapping'
for k, v in sep.items(): v['label_descriptive'] = label(v)
say('\n== ARM SEPARATION (R_all = reward per 100 ticks over the whole run; paired over the same 50 cells)')
say('pair   mean(first-second)  sign-consistency  dz     identical-fingerprint cells  first executed-attempt divergence (median tick; cells never diverging)  descriptive label (fp-identical >= 90% -> indistinguishable; sign consistency >= 0.7 and |dz| >= 0.5 -> separated; else overlapping)')
for k, v in sep.items(): say(f"{k}  {v['R_all_mean']:8.2f}  {v['sign_consistency']:.2f}  {f2(v['dz'])}  {v['fp_equal_frac'] * 50:.0f}/50  {v['first_div_median']}  never {v['no_divergence_cells']}  {v['label_descriptive']}")
say('per-arm R_all mean (SD over cells): ' + '; '.join(f"{a} {Rw_all[a].mean():.1f} ({Rw_all[a].flatten().std(ddof=1):.1f})" for a in ARMS))

# ---------------------------------------------------------------- 10. FutureScore / replay (what the measurement layer can and cannot say)
RP = {}
for a in ARMS:
    sh = {w: float(agg(a, lambda r, w=w: r['extras']['byWin'][w]['replay'] / WSIZE[w]).mean()) for w in WIN}
    rr = spearman(agg(a, lambda r: r['counts']['replays'] / 3000).flatten(), Rw_all[a].flatten())
    RP[a] = dict(replay_share_by_window=sh, replay_share_overall=float(agg(a, lambda r: r['counts']['replays'] / 3000).mean()), spearman_replayshare_vs_Rall_across_50_cells=rr)
res['replay'] = RP
say('\n== REPLAY (measured); FutureScore is not separately recorded (candidate F is the pre-clamp total score)')
for a in ARMS: say(f"  {a}: replay share of ticks W1..W4 " + '/'.join(f"{RP[a]['replay_share_by_window'][w]:.3f}" for w in WIN) + f" overall {RP[a]['replay_share_overall']:.3f}; Spearman(replay share, R_all) across 50 cells {f2(RP[a]['spearman_replayshare_vs_Rall_across_50_cells'])}")

# ---------------------------------------------------------------- 11. why F-11 was non-decisive: quantities
def whyvoid(x, y, w):
    t = X(f'{x}-{y}', w, 'pooled'); hw = (t['upper'] - t['lower']) / 2; q = hw / t['se'] if t['se'] else None
    d = Rw[x][w] - Rw[y][w]; sd_cells = d.flatten().std(ddof=1)
    return dict(dbar=t['dbar'], se=t['se'], halfwidth=hw, tcrit=q, nu=t['nu'], MS_C=t['MS_C'], MS_S=t['MS_S'], MS_CS=t['MS_CS'], se_share_config=t['MS_C'] / (t['MS_C'] + t['MS_S']), sd_cell_differences=float(sd_cells),
                se_needed_for_dbar_to_exclude_zero=abs(t['dbar']) / q if q else None, se_reduction_factor_needed=t['se'] / (abs(t['dbar']) / q) if q and t['dbar'] else None, mean_R_both_arms=float((Rw[x][w].mean() + Rw[y][w].mean()) / 2))
WV = {f'{x}-{y}|{w}': whyvoid(x, y, w) for (x, y) in (('A7', 'A2'), ('A1', 'A2')) for w in ('W1', 'W3')}; res['why_void'] = WV
say('\n== WHY F-11 DID NOT EXCLUDE ZERO (A7 - A2 is the frozen contrast; A1 - A2 shown for comparison; pooled 10 x 5)')
for k, v in WV.items(): say(f"  {k}: dbar {v['dbar']:.2f}, se {v['se']:.2f}, 99% half-width {v['halfwidth']:.1f} (t crit {v['tcrit']:.3f} at nu {v['nu']}); SD of cell differences {v['sd_cell_differences']:.1f}; share of se^2 from the configuration mean-square {v['se_share_config']:.2f}; mean reward of the two arms {v['mean_R_both_arms']:.1f}; se would have to fall by x{v['se_reduction_factor_needed']:.1f} for this dbar to clear zero")
res['why_void']['_note'] = 'with S = 5 seeds, nu = min(C-1, S-1) = 4 for both the 5x5 and the 10x5 array: the t critical value (about 4.6) does not shrink with more configurations'
# variance of raw R by arm: how much of the spread is configuration?
VR = {}
for a in ('A1', 'A2', 'A7'):
    for w in ('W1', 'W3'):
        g = Rw[a][w]; tot = g.var(ddof=1); cfgv = g.mean(1).var(ddof=1); VR[f'{a}|{w}'] = dict(total_var=float(tot), config_mean_var=float(cfgv), config_share=float(min(1, cfgv / tot)), sd=float(np.sqrt(tot)), config_means=[float(v) for v in g.mean(1)])
res['raw_R_variance'] = VR; say('  raw reward spread: ' + '; '.join(f"{k} SD {v['sd']:.1f}, config means SD {np.sqrt(v['config_mean_var']):.1f}" for k, v in VR.items()))
# sample-size reasoning (descriptive, scaling only; not a power analysis)
say('  note: with 5 seeds the t critical value stays 4.604 whatever the number of configurations; only the standard error can shrink.')

# ---------------------------------------------------------------- 12. further post-hoc checks: a mechanism-proximal outcome, robustness, and where the reward variance lives
from scipy import stats
slipW = lambda a, w: agg(a, lambda r: np.nan if r['slip'][w]['nonGoal'] is None else r['slip'][w]['nonGoal'])
SL = {}
for (x, y) in (('A1', 'A2'), ('A7', 'A2'), ('A6', 'A2'), ('A5', 'A2'), ('A4', 'A2'), ('A3', 'A2'), ('A1', 'A7')):
    SL[f'{x}-{y}'] = {}
    for w in WIN:
        d = slipW(x, w) - slipW(y, w); e = eff(d); SL[f'{x}-{y}'][w] = {k: e[k] for k in ('mean', 'median', 'q1', 'q3', 'sd', 'npos', 'nneg', 'dz', 'cfg_pos', 'seed_pos', 'stage1_mean', 'ext_mean')}
res['slip_contrasts'] = SL
say('\n== SLIP RATE, a mechanism-proximal outcome (non-goal-entering attempts that slipped; paired over 50 cells; difference = first minus second arm)')
say('contrast  window  mean diff  median  cells lower/higher  config(+ means higher)/10  dz   stage1 mean | extension mean')
for k, v in SL.items():
    if k in ('A1-A2', 'A7-A2', 'A6-A2', 'A5-A2', 'A4-A2'):
        for w in WIN: e = v[w]; say(f"  {k}  {w}  {e['mean']:+.3f}  {e['median']:+.3f}  {e['nneg']}/{e['npos']}  {e['cfg_pos']}/10  {f2(e['dz'])}  {e['stage1_mean']:+.3f} | {e['ext_mean']:+.3f}")
assoc = {}
for (x, y, w) in (('A1', 'A2', 'W2'), ('A7', 'A2', 'W2'), ('A1', 'A2', 'W3'), ('A7', 'A2', 'W3')):
    ds = (slipW(x, w) - slipW(y, w)).flatten(); dr = (Rw[x][w] - Rw[y][w]).flatten(); assoc[f'{x}-{y}|{w}'] = spearman(ds, dr)
res['slip_vs_reward_association'] = assoc; say('Spearman across cells between the slip-rate difference and the reward difference (descriptive association): ' + '; '.join(f'{k}: {f2(v)}' for k, v in assoc.items()))
ROB = {}
for (x, y) in (('A1', 'A2'), ('A7', 'A2'), ('A1', 'A4'), ('A1', 'A3')):
    for w in ('W1', 'W3', 'R_all'):
        f = (Rw[x][w] - Rw[y][w]).flatten()
        try: wp = float(stats.wilcoxon(f).pvalue)
        except Exception: wp = None
        ROB[f'{x}-{y}|{w}'] = dict(skew=float(stats.skew(f)), excess_kurtosis=float(stats.kurtosis(f)), trimmed10_mean=float(stats.trim_mean(f, 0.1)), median=float(np.median(f)), wilcoxon_p_exploratory=wp, mad=float(np.median(np.abs(f - np.median(f)))))
res['robustness'] = ROB
say('\n== ROBUSTNESS of the reward contrasts (post hoc; Wilcoxon p-values are exploratory, uncorrected, 12 listed here, not confirmatory)')
for k, v in ROB.items(): say(f"  {k}: median {v['median']:+.1f}, 10%-trimmed mean {v['trimmed10_mean']:+.1f}, skew {v['skew']:+.2f}, excess kurtosis {v['excess_kurtosis']:+.2f}, Wilcoxon p {f2(v['wilcoxon_p_exploratory'])}")
R2 = {f'{a}|{w}': float(np.corrcoef(Rw[a][w].flatten(), GR[a][w].flatten())[0, 1] ** 2) for a in ARMS for w in WIN}; res['R2_reward_on_goalrate'] = R2
say(f"share of reward variance across cells explained by the goal-reach rate (R^2): median {np.median(list(R2.values())):.2f}, min {min(R2.values()):.2f}, max {max(R2.values()):.2f}")
# cell-level reward distribution: heavy-tailed or not?
allR = np.array([Rw[a][w].flatten() for a in ARMS for w in ('W2', 'W4')]).flatten(); say(f"reward per 100 ticks over all arms in W2 and W4 (n = {len(allR)}): skew {stats.skew(allR):+.2f}, excess kurtosis {stats.kurtosis(allR):+.2f}, fraction of cells below 0: {(allR < 0).mean():.3f}, above 200: {(allR > 200).mean():.3f}")
# the two independent halves (Stage 1 configs 0-4, extension configs 5-9): do the headline reward effects keep their sign?
HALF = {f'{x}-{y}|{w}': dict(stage1=EM[f'{x}-{y}|{w}']['stage1_mean'], extension=EM[f'{x}-{y}|{w}']['ext_mean']) for (x, y) in CON[:7] for w in ('W1', 'W3', 'R_all')}
res['halves'] = HALF; say('same sign in both independent halves (reward, W1/W3/R_all): ' + ', '.join(f"{k}:{'Y' if v['stage1'] * v['extension'] > 0 else 'N'}" for k, v in HALF.items()))

json.dump(res, open(f'{OUT}/analysis.json', 'w'), indent=1, default=lambda o: None if o != o else str(o))

# ================================================================ FIGURES (each answers one question)
plt.rcParams.update({'font.size': 9, 'figure.dpi': 130})
# fig1: which cells carry A1-A2 and A7-A2?
fig, ax = plt.subplots(2, 2, figsize=(9, 8.5))
for k, (x, y, w) in enumerate((('A1', 'A2', 'W1'), ('A1', 'A2', 'W3'), ('A7', 'A2', 'W1'), ('A7', 'A2', 'W3'))):
    a = ax.flat[k]; d = Rw[x][w] - Rw[y][w]; m = np.abs(d).max(); im = a.imshow(d, cmap='RdBu', vmin=-m, vmax=m, aspect='auto')
    for c in range(10):
        for j in range(5): a.text(j, c, f'{d[c, j]:.0f}', ha='center', va='center', fontsize=7)
    a.set_xticks(range(5)); a.set_xticklabels([str(s)[-3:] for s in SEEDS]); a.set_yticks(range(10)); a.set_title(f'{x} - {y}, {w}  (mean {d.mean():.1f}; +{int((d > 0).sum())}/-{int((d < 0).sum())} cells)'); a.set_xlabel('agent seed'); a.set_ylabel('configuration index'); a.axhline(4.5, color='k', lw=0.8)
    plt.colorbar(im, ax=a, fraction=0.046)
fig.suptitle('Fig 1. Reward difference per configuration x seed cell (post hoc, descriptive). Line: Stage 1 (0-4) | extension (5-9)', fontsize=9); fig.tight_layout(); fig.savefig(f'{FIG}/fig1_cell_heatmaps.png'); plt.close(fig)
# fig2: effect-size distributions
fig, ax = plt.subplots(1, 2, figsize=(11, 4.2), sharey=True)
for k, w in enumerate(('W1', 'W3')):
    a = ax[k]; data = [(Rw['A1'][w] - Rw[y][w]).flatten() for y in ARMS[1:]]; a.boxplot(data, showfliers=False, widths=0.5); a.axhline(0, color='k', lw=0.8)
    for i, d in enumerate(data): a.scatter(np.random.default_rng(i).normal(i + 1, 0.06, len(d)), d, s=6, alpha=0.5)
    a.set_xticks(range(1, 7)); a.set_xticklabels([f'A1-{y}' for y in ARMS[1:]]); a.set_title(f'{w}: cell differences (n = 50 each)'); a.set_ylabel('reward per 100 ticks')
fig.suptitle('Fig 2. Distribution of A1 minus other-arm differences across the 50 cells (descriptive)', fontsize=9); fig.tight_layout(); fig.savefig(f'{FIG}/fig2_effect_distributions.png'); plt.close(fig)
# fig3: reward over time
fig, ax = plt.subplots(1, 2, figsize=(12, 4.2)); xs = np.arange(30) * 100 + 50
for a in ARMS: ax[0].plot(xs, tl[a]['mean'], color=COL[a], label=f'{a} {NAMES[a]}'); ax[0].fill_between(xs, np.array(tl[a]['mean']) - tl[a]['cluster_se'], np.array(tl[a]['mean']) + tl[a]['cluster_se'], color=COL[a], alpha=0.1)
for a in ('A1', 'A4', 'A7'): ax[1].plot(xs, np.array(tl[a]['mean']) - np.array(tl['A2']['mean']), color=COL[a], label=f'{a} - A2')
for a_ in ax: a_.axvline(1500, color='k', ls='--', lw=0.8); a_.set_xlabel('tick (tau), 100-tick bins')
ax[0].set_ylabel('mean reward per 100 ticks (band: configuration-cluster SE)'); ax[0].legend(fontsize=7, ncol=2); ax[1].axhline(0, color='k', lw=0.8); ax[1].legend(fontsize=8); ax[1].set_ylabel('difference from A2')
fig.suptitle('Fig 3. Reward time course; dashed line = hidden reliability change at tau = 1500', fontsize=9); fig.tight_layout(); fig.savefig(f'{FIG}/fig3_reward_timecourse.png'); plt.close(fig)
# fig4: trust calibration
fig, ax = plt.subplots(1, 3, figsize=(13, 4.2), sharey=True)
for k, (lab, key, t) in enumerate((('tau1499', 'tau1499_vs_pI', 'tau = 1499 vs phase-I p'), ('tau2999', 'tau2999_vs_pII', 'tau = 2999 vs phase-II p'), ('tau2999', 'tau2999_vs_pI(stale)', 'tau = 2999 vs phase-I p (stale)'))):
    a = ax[k]
    for arm in ('A1', 'A2', 'A4', 'A7'):
        b = [q for q in CAL[arm][key]['bins'] if q['n'] > 0]; a.plot([q['meanTrust'] for q in b], [q['meanP'] for q in b], 'o-', color=COL[arm], ms=3, label=f'{arm} (n={CAL[arm][key]["n"]})')
    a.plot([0, 1], [0, 1], 'k:', lw=0.8); a.set_xlabel('mean trust in the bin'); a.set_title(t); a.legend(fontsize=7)
ax[0].set_ylabel('mean configured p of the keys in the bin')
fig.suptitle('Fig 4. Trust vs configured reliability (keys with >= 5 raw attempts, pooled over runs). Dotted: perfect agreement', fontsize=9); fig.tight_layout(); fig.savefig(f'{FIG}/fig4_trust_calibration.png'); plt.close(fig)
# fig5: arm separation
fig, ax = plt.subplots(1, 2, figsize=(11, 4.4)); im = ax[0].imshow(fpm * 50, cmap='viridis', vmin=0, vmax=50)
for i in range(7):
    for j in range(7): ax[0].text(j, i, f'{fpm[i, j] * 50:.0f}', ha='center', va='center', color='w', fontsize=7)
ax[0].set_xticks(range(7)); ax[0].set_xticklabels(ARMS); ax[0].set_yticks(range(7)); ax[0].set_yticklabels(ARMS); ax[0].set_title('cells (of 50) with identical fingerprints'); plt.colorbar(im, ax=ax[0], fraction=0.046)
for pair, c in (('A1|A2', COL['A1']), ('A1|A7', COL['A7']), ('A2|A5', COL['A5']), ('A1|A4', COL['A4'])):
    v = np.array([q for q in divs[pair] if q is not None], float); ax[1].hist(np.log10(np.maximum(v, 0) + 1), bins=np.linspace(0, 3.5, 22), alpha=0.5, color=c, label=f'{pair} ({len(v)}/50 diverge)')
ax[1].set_xlabel('log10(tick of first different executed attempt + 1)'); ax[1].set_ylabel('cells'); ax[1].legend(fontsize=7); ax[1].set_title('when do two arms first act differently?')
fig.suptitle('Fig 5. Do the arms separate behaviourally at all?', fontsize=9); fig.tight_layout(); fig.savefig(f'{FIG}/fig5_arm_separation.png'); plt.close(fig)
# fig6: decision mechanism
fig, ax = plt.subplots(1, 3, figsize=(14, 4.2))
for a in ('A1', 'A3', 'A4', 'A6', 'A7'): ax[0].plot(range(4), [FL[a]['flip_rate_by_window'][w] for w in WIN], 'o-', color=COL[a], label=a)
ax[0].set_xticks(range(4)); ax[0].set_xticklabels(WIN); ax[0].set_ylabel('flips per decision tick'); ax[0].set_title('trust-term flip rate (shadow T = 0.5)'); ax[0].legend(fontsize=7)
ff = np.array([r[2] if r[2] is not None else np.nan for r in rel]); dd = np.array([r[3] if r[3] is not None else np.nan for r in rel]); ax[1].scatter(ff + 1, dd + 1, s=14); lim = [1, 3200]; ax[1].plot(lim, lim, 'k:', lw=0.8); ax[1].set_xscale('log'); ax[1].set_yscale('log')
ax[1].set_xlabel('A1: first flip tick + 1'); ax[1].set_ylabel('A1 vs A2: first different attempt tick + 1'); ax[1].set_title('is divergence explained by the first flip?')
a1m = np.array([x['link3']['monotonicity']['decisions'] for x in runs if x['arm'] == 'A1']).sum(0); a1f = np.array([x['link3']['monotonicity']['flips'] for x in runs if x['arm'] == 'A1']).sum(0)
ax[2].bar(range(5), a1f / np.maximum(1, a1m)); ax[2].set_xticks(range(5)); ax[2].set_xticklabels(['0-.1', '.1-.2', '.2-.3', '.3-.4', '.4-.5']); ax[2].set_xlabel('max |T - 0.5| over candidates'); ax[2].set_ylabel('flip rate'); ax[2].set_title('A1: flip rate vs trust deviation (pooled)')
fig.suptitle('Fig 6. Is the trust mechanism changing decisions?', fontsize=9); fig.tight_layout(); fig.savefig(f'{FIG}/fig6_decision_mechanism.png'); plt.close(fig)
# fig7: F-11 forest and the pooled A1 contrasts
fig, ax = plt.subplots(1, 2, figsize=(12, 4.4))
rows_ = [('initial 5x5', 'stage1'), ('extension 5x5', 'extension'), ('final 10x5', 'pooled')]; yy = 0; ticks = []
for w, off in (('W1', 0), ('W3', 4)):
    for k, (nm, sc) in enumerate(rows_):
        x = X('A7-A2', w, sc); ax[0].errorbar(x['dbar'], yy, xerr=[[x['dbar'] - x['lower']], [x['upper'] - x['dbar']]], fmt='o', color='C0' if sc != 'pooled' else 'C3', capsize=3); ticks.append((yy, f'{w} {nm}')); yy += 1
    yy += 1
ax[0].axvline(0, color='k', lw=0.8); ax[0].set_yticks([t[0] for t in ticks]); ax[0].set_yticklabels([t[1] for t in ticks]); ax[0].set_xlabel('A7 - A2, reward per 100 ticks (99% crossed CI)'); ax[0].set_title('F-11 contrast: frozen intervals, all containing 0'); ax[0].invert_yaxis()
yy = 0; ticks = []
for w in ('W1', 'W3'):
    for y in ARMS[1:]:
        x = X(f'A1-{y}', w, 'pooled'); ax[1].errorbar(x['dbar'], yy, xerr=[[x['dbar'] - x['lower']], [x['upper'] - x['dbar']]], fmt='o', color=COL[y], capsize=2); ticks.append((yy, f'{w} A1-{y}')); yy += 1
    yy += 1
ax[1].axvline(0, color='k', lw=0.8); ax[1].set_yticks([t[0] for t in ticks]); ax[1].set_yticklabels([t[1] for t in ticks], fontsize=7); ax[1].set_xlabel('99% crossed CI (post hoc; 12 intervals, no multiplicity adjustment)'); ax[1].set_title('A1 contrasts, pooled 10 x 5'); ax[1].invert_yaxis()
fig.suptitle('Fig 7. Why F-11 stayed non-decisive: interval width vs point estimate (post hoc)', fontsize=9); fig.tight_layout(); fig.savefig(f'{FIG}/fig7_f11_intervals.png'); plt.close(fig)
# fig8: learning
fig, ax = plt.subplots(1, 3, figsize=(13, 4.2)); xa = np.arange(7)
ax[0].bar(xa - 0.2, [LN[a]['coverage']['tau1499'] for a in ARMS], 0.4, label='tau 1499'); ax[0].bar(xa + 0.2, [LN[a]['coverage']['tau2999'] for a in ARMS], 0.4, label='tau 2999'); ax[0].set_xticks(xa); ax[0].set_xticklabels(ARMS); ax[0].set_title('fraction of attempted keys with >= 3 attempts'); ax[0].legend(fontsize=7)
ax[1].bar(xa - 0.2, [PH[a]['I']['auc_mean'] for a in ARMS], 0.4, label='phase I'); ax[1].bar(xa + 0.2, [PH[a]['II']['auc_mean'] for a in ARMS], 0.4, label='phase II'); ax[1].axhline(0.5, color='k', lw=0.8); ax[1].set_ylim(0.4, 0.7); ax[1].set_xticks(xa); ax[1].set_xticklabels(ARMS); ax[1].set_title('AUC of prior trust for the attempt outcome'); ax[1].legend(fontsize=7)
for a in ARMS: ax[2].plot(range(4), [Rw[a][w].mean() for w in WIN], 'o-', color=COL[a], label=a)
ax[2].set_xticks(range(4)); ax[2].set_xticklabels(WIN); ax[2].set_ylabel('mean reward per 100 ticks'); ax[2].set_title('reward by window, all arms'); ax[2].legend(fontsize=7, ncol=2)
fig.suptitle('Fig 8. Did the learning machinery acquire usable information, and did it matter?', fontsize=9); fig.tight_layout(); fig.savefig(f'{FIG}/fig8_learning.png'); plt.close(fig)
open(f'{OUT}/summary.txt', 'w').write('\n'.join(S) + '\n'); print('\nfigures:', sorted(os.listdir(FIG)))
