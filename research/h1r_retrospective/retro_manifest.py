"""Writes research/h1r_retrospective/RETRO_MANIFEST.json: input hashes, script hashes, runtime versions, commands and output hashes.
Run from the repository root after retro_extract.mjs and retro_analyze.py:  python research/h1r_retrospective/retro_manifest.py
No clock, no host path. Read-only with respect to the experiment.
"""
import hashlib, json, subprocess, sys, platform
import numpy, scipy, matplotlib

W = 'research/h1r_retrospective'
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
node = subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip()
git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True).stdout.strip()
M1, ME = json.load(open('experiments/h1r/stage_records/stage1_manifest.json')), json.load(open('experiments/h1r/stage_records/extension_manifest.json'))
dig = lambda M: hashlib.sha256(''.join(sorted(f"{r['runId']} {r['sha256']}\n" for r in M['runs'] if r['role'] == 'base' or r['role'] == 'determinism')).encode()).hexdigest()
outs = ['out/config_tables.json', 'out/run_metrics.json', 'out/trust_pairs.json', 'out/cells_pairwise.json', 'out/crossed.json', 'out/f11_reproduction.json', 'out/analysis.json', 'out/summary.txt'] + [f'figures/fig{i}_{n}.png' for i, n in ((1, 'cell_heatmaps'), (2, 'effect_distributions'), (3, 'reward_timecourse'), (4, 'trust_calibration'), (5, 'arm_separation'), (6, 'decision_mechanism'), (7, 'f11_intervals'), (8, 'learning'))]
doc = {
    'schema': 'h1r.retrospective-manifest/1',
    'status': 'POST-HOC, EXPLORATORY, READ-ONLY. H1-R is closed as VOID (D-032). Nothing here is a confirmatory test or a verdict.',
    'repositoryHead': git('rev-parse', 'HEAD'),
    'inputs': {
        'stage1_manifest.json': {'path': 'experiments/h1r/stage_records/stage1_manifest.json', 'sha256': sha('experiments/h1r/stage_records/stage1_manifest.json')},
        'extension_manifest.json': {'path': 'experiments/h1r/stage_records/extension_manifest.json', 'sha256': sha('experiments/h1r/stage_records/extension_manifest.json')},
        'stage1_input.json': {'path': 'experiments/h1r/stage_records/stage1_input.json', 'sha256': sha('experiments/h1r/stage_records/stage1_input.json'), 'note': 'untracked derived artifact, read for the F-11 reproduction'},
        'stage1_decision.json': {'path': 'experiments/h1r/stage_records/stage1_decision.json', 'sha256': sha('experiments/h1r/stage_records/stage1_decision.json')},
        'raw': {'stage1': 'experiments/h1r/data/raw/stage1 (175 base + 7 determinism records + ledger; every record SHA-256 checked against the manifest by retro_extract.mjs)', 'extension': 'experiments/h1r/data/raw/extension (same shape)'},
        'datasetDigests': {'stage1': 'efb48b05d16996facdae5f1e5e1053020b0799589c7c382f51c6d2cfd6db555c', 'extension': '031fbf1fc89e937d6a28ceed21c12c2dd0f3d5ecda1b45710f7c2b22f47a11aa', 'definition': 'SHA-256 over the sorted "runId sha256\\n" lines of the 182 records of that dataset'},
        'frozenCode': {'analyze.js': sha('experiments/h1r/analyze.js'), 'orchestrate.mjs': sha('experiments/h1r/orchestrate.mjs'), 'build_tree.mjs': sha('experiments/h1r/build_tree.mjs'), 'BUILD_IDENTITY.json': sha('experiments/h1r/BUILD_IDENTITY.json'), 'preregistration': sha('research/preregistrations/H1R_PREREGISTRATION_v1.0.md')},
    },
    'scripts': {f'{W}/{n}': sha(f'{W}/{n}') for n in ('retro_extract.mjs', 'retro_analyze.py', 'retro_manifest.py')},
    'runtime': {'node': node, 'python': platform.python_version(), 'numpy': numpy.__version__, 'scipy': scipy.__version__, 'matplotlib': matplotlib.__version__, 'bootstrapSeed': 20261006, 'bootstrapReplicates': 10000},
    'commands': ['node research/h1r_retrospective/retro_extract.mjs', 'python research/h1r_retrospective/retro_analyze.py', 'python research/h1r_retrospective/retro_manifest.py'],
    'reproducibility': 'two complete re-runs of the first two commands produced byte-identical outputs (all 16 listed files)',
    'outputs': {f'{W}/{o}': sha(f'{W}/{o}') for o in outs},
}
open(f'{W}/RETRO_MANIFEST.json', 'w').write(json.dumps(doc, indent=1) + '\n')
print(json.dumps({'scripts': doc['scripts'], 'inputs': {k: (v['sha256'] if isinstance(v, dict) and 'sha256' in v else '...') for k, v in doc['inputs'].items()}}, indent=1))
print('RETRO_MANIFEST.json sha256', sha(f'{W}/RETRO_MANIFEST.json'))
