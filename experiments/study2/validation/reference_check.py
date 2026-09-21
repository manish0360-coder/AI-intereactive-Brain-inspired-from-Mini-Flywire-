"""Study-2 VALIDATION-ONLY reference calculations. Not a runtime dependency of anything.

Reads validation/cases.json written by validate.mjs and writes validation/reference.json with:
  * SciPy Kendall tau-b (scipy.stats.kendalltau, variant='b') for every tau-b test case
  * NetworkX Dijkstra expected-cost-to-goal for every (fixture, phase, goal) oracle case

SciPy and NetworkX are used here ONLY as independent references for project-owned code. Neither is
added to the project; nothing in the production tree or the Study-2 runtime imports this file.
"""
import json
import math
import sys
from pathlib import Path

import networkx as nx
import scipy
from scipy.stats import kendalltau

HERE = Path(__file__).resolve().parent
cases = json.loads((HERE / "cases.json").read_text(encoding="utf-8"))

def decode(v):
    return -math.inf if v == "-Infinity" else float(v)

taub = []
for case in cases["taub"]:
    x = [decode(v) for v in case["x"]]
    y = [decode(v) for v in case["y"]]
    if len(x) < 2:
        taub.append({"id": case["id"], "tau": None, "nan": True})
        continue
    res = kendalltau(x, y, variant="b")
    stat = float(res.statistic)
    taub.append({"id": case["id"], "tau": None if math.isnan(stat) else stat, "nan": math.isnan(stat)})

oracle = []
for case in cases["oracle"]:
    g = nx.Graph()
    for u, v, w in case["edges"]:
        g.add_edge(u, v, weight=w)
    dist = nx.single_source_dijkstra_path_length(g, case["goal"], weight="weight")
    oracle.append({"id": case["id"], "cost": {str(k): v for k, v in dist.items()}})

out = {"scipy": scipy.__version__, "networkx": nx.__version__, "python": sys.version.split()[0],
       "taub": taub, "oracle": oracle}
(HERE / "reference.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
print(f"reference written: {len(taub)} tau-b cases, {len(oracle)} oracle cases "
      f"(scipy {scipy.__version__}, networkx {nx.__version__})")
