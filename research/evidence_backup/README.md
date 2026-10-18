# Raw-archive backup status

**Status: OPEN. Neither raw archive has an off-machine copy.** Checked 2026-10-19; nothing was uploaded, nothing was committed to
Git, and no historical result was regenerated or modified.

| archive | bytes | sha256 | location (this machine only) |
|---|---|---|---|
| GATE-FLOOR-PRODSEM block P `blockP_raw_cfc1e5c_e60cdc8.tar.gz` | 12,368,214 | `a05a94c98377deac8bfc665d18a10a57251436b1412450f2960528d723d34519` | `E:/Projects/OpenSourceLab/archives/gate-floor-prodsem/` |
| GATE-FLOOR-INTERACTION block I `blockI_raw_80f83ad.tar.gz` | 15,111,758 | `55efff3683a9059aa2581eafb894f5d1a7b74cd71d5a6869e7f497ac2729bdc9` | `E:/Projects/OpenSourceLab/archives/gate-floor-interaction/` |

Both were re-hashed on 2026-10-19 and match their committed records (`backup_manifest.json`, the per-block `archive_block*.json`).

## Why no second copy was made (FACT, checked on this machine)

* The only remote the project controls and this machine is signed in to is the GitHub repository (`origin`, credential manager
  `manager`). The repository is **public** (`private: false`, unauthenticated API read), so a published release asset or a Git LFS
  object would be **public publication** of raw experiment traces, which the instruction did not authorize; committing the
  archives to Git is excluded by the instruction itself.
* No command-line or connector route to any other storage exists: `gh`, `rclone`, `aws`, `az`, `gsutil`, `azcopy`, `s3cmd`, `restic`
  are not installed; the session's connectors are Claude Docs, visualize and scheduled-tasks (none stores binary files); no project
  document names a storage destination. Git LFS is installed but is not configured in the repository (a new mechanism, not an existing one).
* A draft GitHub release would keep the files non-public, but creating one from this machine means calling the GitHub API with the
  credential-manager token; that token was **not** extracted or used outside `git push`.

## Smallest actionable next step (about two minutes, owner action)

1. In the browser: repository → **Releases → Draft a new release** → choose a tag name (for example `evidence-archives-2026-10-15`; a
   draft does not create the tag) → attach the two `.tar.gz` files → **Save draft** (do **not** publish). A draft is visible only to
   repository collaborators.
   *Or* install the CLI and run: `winget install --id GitHub.cli`, `gh auth login`, then
   `gh release create evidence-archives-2026-10-15 --draft --title "Raw archives (blocks P and I)" <the two files>`.
2. Retrieve and verify (anywhere): download both assets (browser, or `gh release download evidence-archives-2026-10-15`), then

   ```bash
   node research/evidence_backup/verify_backup_copy.mjs blockP_raw_cfc1e5c_e60cdc8.tar.gz blockI_raw_80f83ad.tar.gz
   node experiments/gate-floor-prodsem/verify_archive_blockP.mjs --archive blockP_raw_cfc1e5c_e60cdc8.tar.gz
   node experiments/gate-floor-interaction/verify_archive_blockI.mjs --archive blockI_raw_80f83ad.tar.gz
   ```

   The first command compares size and sha256 with the committed record; the other two extract the archive and verify every session
   hash, the plan/controls hashes and every delivered store against the experiment's committed manifest.
3. Record the destination in `backup_manifest.json` (`secondCopy`) and set `backupStatus` to `CLOSED`.

*Alternative with no GitHub involvement:* copy both files to any external drive or a cloud folder you control, and run the three
commands above against the copies. Either route closes the risk; the sha256 values above are the contract.

## Limits

A second copy on this machine (another folder or drive) would guard against accidental deletion only, not against loss of the machine;
it is not counted as a backup here.
