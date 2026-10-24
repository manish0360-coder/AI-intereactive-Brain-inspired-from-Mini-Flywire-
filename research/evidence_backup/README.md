# Raw-archive backup status

**Status: CLOSED (2026-10-24).** A verified, byte-identical second copy of both archives exists on a separate removable USB
device. The device was detached from this computer when the record was made. **PENDING owner confirmation:** safe ejection and
storage away from this computer. **Not claimed:** that the drive will remain available. Nothing was uploaded, no archive was
committed to Git, and no historical result was regenerated or modified.

## Second copy (2026-10-24, FACT)

* **Destination:** `F:\MiniFlyWire_Evidence_Backup\`, holding both `.tar.gz` files plus `SHA256SUMS.txt`.
  * The destination existed and was empty; the copy used no-overwrite.
  * The device is a removable USB flash drive: volume label "WINDOWS 10", FAT32, physical disk 1 "USB DISK 3.0", bus type USB. It
    is a different device from the internal NVMe disk.
* **Checks on each copy (all passed):**
  * `sha256sum` and Windows `Get-FileHash` both equal the recorded sha256;
  * `cmp` shows it byte-identical to the primary;
  * `gzip -t` passes;
  * the tar listing, made without extracting, is identical to the primary's: 2,526 entries for block P and 3,086 for block I;
  * `verify_backup_copy.mjs` reports MATCH;
  * the per-block content verifier passes: 1,680 sessions and 560 stores for block P, 2,520 sessions and 280 stores for block I;
  * `sha256sum -c SHA256SUMS.txt` on the drive passes.
* **Sources:** unchanged, with the same sha256 and timestamps.
* **Detached:** at 2026-10-24T17:08:52+05:30 no USB disk was attached to this computer.
* **Re-check later:** run `sha256sum -c SHA256SUMS.txt` in the backup folder, or the three commands under "Earlier suggestion"
  below.

The entries further down are the history of how this record was opened. They are kept unchanged.

## Re-check 2026-10-20 (FACT)

* **Sources verified.** Both archives exist at the paths below and hash to the recorded values.
  * Block P: its own verifier extracts it and confirms that all 1,680 session records and 560 delivered stores match the committed
    manifest.
  * Block I: all 2,520 session records and 280 delivered stores match.
* **No authorized off-machine destination exists on this machine.**
  * C:, D: and E: are partitions of the single internal disk.
  * There is no removable drive and no mapped network share.
  * The OneDrive and Dropbox folders are leftovers: neither client is installed or signed in, so nothing placed there would sync.
  * No storage CLI is installed.
  * The GitHub repository is public and is excluded.

  A copy to any of these would be a local duplicate and is not counted. No copy was made. The result is recorded in
  `backup_manifest.json` (`checks`).
* **Withdrawn.** The earlier "draft release on the GitHub repository" suggestion below is withdrawn: the 2026-10-20 instruction
  excludes uploads to a public repository. Use one of the two owner actions in the next section.

## Owner action that closes it (choose one; the verification is then done here)

1. **External drive (smallest; no account involved).** Connect any USB drive or external disk with ≥ 30 MB free and name its drive
   letter. Both files are then copied and each copy is re-hashed and deep-verified *on the drive*. You then eject it and keep it away
   from this computer. A drive that stays attached is not off-machine.
2. **Private storage you control.** Create an empty **private** GitHub repository (for example `mini-flywire-evidence`, visibility
   Private) and give its URL with permission to push to it. The archives are pushed there, the repository is confirmed not publicly
   readable, and a **fresh clone downloaded from GitHub** is hashed and deep-verified. That proves the copy that is off the machine.

Either route ends with `secondCopy` filled in `backup_manifest.json` and `backupStatus: CLOSED`. Doing both gives two independent copies.

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

## Earlier suggestion (2026-10-19; the draft-release route is withdrawn, the verification commands still apply to any copy)

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

## LEARN-0 block L (2026-10-25, FACT)

* **Archive:** `blockL_raw_cc8a42d.tar.gz`, 13,295,150 bytes, sha256 `a943ddb25b00ea086e9feece109790da2e17f56fde3e633ce158987d239cbf27`
  (primary: `E:/Projects/OpenSourceLab/archives/learn0/`; record: `experiments/learn0/results/archive_blockL.json`).
* **Second copy:** `F:\MiniFlyWire_Evidence_Backup\learn0_blockL_cc8a42d\` on the same removable USB device as blocks P and I, in a new
  folder (no overwrite), with the evidence snapshot `blockL_evidence_snapshot_cc8a42d\` (17 files) and its `SHA256SUMS.txt`.
  Verified 2026-10-25: three independent hashes, `cmp`, `gzip -t`, the 2,527-entry listing, all 2,524 extracted files against the
  inventory, `verify_archive_blockL.mjs` on the extracted tree, the snapshot manifest 17 of 17. The block P/I copies were unchanged.
* **Re-checked after physical re-insertion (2026-10-25, PASSED).** The Windows log shows the drive removed at 00:57 IST and re-attached
  at 01:13:27 IST. On re-insertion:
  * three independent hashes;
  * `gzip -t`;
  * the 2,527-entry listing;
  * the snapshot manifest 17 of 17;
  * `verify_archive_blockL.mjs --archive` PASS;
  * `verify_backup_copy.mjs` MATCH;
  * the block P/I copies unchanged.
* **Still pending:** owner confirmation of safe ejection and storage away from this computer. Details: `backup_manifest.json`
  (third archive entry).
