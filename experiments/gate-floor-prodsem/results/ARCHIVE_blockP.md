# GATE-FLOOR-PRODSEM — raw block-P archive (evidence preservation)

The 91 MB raw output of block P (`experiments/gate-floor-prodsem/data/blockP`, git-ignored) is preserved as one deterministic
archive **outside the repository working tree**; this record and `archive_blockP.json` identify and verify it. Nothing was
rewritten or regenerated: the committed result files are unchanged.

| | |
|---|---|
| archive | `blockP_raw_cfc1e5c_e60cdc8.tar.gz` (GNU tar 1.34 \| `gzip -n -9`; `--sort=name`, fixed mtime/owner → reproducible) |
| location (this machine) | `E:/Projects/OpenSourceLab/archives/gate-floor-prodsem/` |
| sha256 | `a05a94c98377deac8bfc665d18a10a57251436b1412450f2960528d723d34519` |
| size | 12,368,214 bytes compressed; 89,145,681 bytes uncompressed |
| contents | `blockP/` : 1,680 `sessions/*.json`, 840 `brains/*.json` (per world: training export, `own-real`, `entry-nr`), `plan.json`, `controls.json`, `MANIFEST.json` (2,523 files) |
| design / manifest | decision digest `99d3ec2c…`, design digest `eead0713…`, manifest digest `eb7ac3654b246af62aac7c8c25ec50c22287f50c533b9027b9d34cf0248190e6` |
| commits | freeze `cfc1e5c1be1c5f8fc3625701302661e280bbb82e`, results `e60cdc85338d207dd278a5b61d6e5191b5deedbc` |

## Verification performed (2026-10-15)

* `MANIFEST.json` equals the committed `results/manifest_blockP.json` byte for byte (sha256 `27fe59bf…`); its digest recomputes
  and is bound to the frozen design.
* All 1,680 session records match the sha256 the manifest holds; the on-disk file set equals the manifest's; `plan.json`
  (`b82ffaaa…`) and `controls.json` (`bddcae33…`) match the manifest's `planSha256` / `controlsSha256`.
* All 560 delivered stores (own-real, entry-nr; 280 worlds) match the episode hashes the controls recorded; each own-real store
  is the training export's episode array.
* The committed `summary_blockP.json` re-derives from the preserved raw data **byte for byte** (frozen `analyze.mjs`, written to a
  temp file, not committed); the four committed result files carry the hashes listed in `RESULTS.md`.
* The archive extracts and verifies by the same script (round trip), and a second creation reproduced the same sha256.

```bash
node experiments/gate-floor-prodsem/verify_archive_blockP.mjs --archive E:/Projects/OpenSourceLab/archives/gate-floor-prodsem/blockP_raw_cfc1e5c_e60cdc8.tar.gz
node experiments/gate-floor-prodsem/verify_archive_blockP.mjs --dir experiments/gate-floor-prodsem/data/blockP
```

## Limit

One local copy outside the working tree; there is no off-machine copy unless the owner makes one (12 MB; the sha256 above
identifies it). No raw data are missing or inconsistent.
