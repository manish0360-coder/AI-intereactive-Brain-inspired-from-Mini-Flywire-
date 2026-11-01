# COG-A raw-data backup record (2026-11-01)

**Status of this file.** A new record of one backup operation. It changes no existing record. `README.md` and `backup_manifest.json` in this folder are unchanged, and their status labels are not reconciled here.

**Not claimed.** This is not a fully independent or redundant backup strategy. The source data and the local primary archive are on the same internal disk, and the USB backup is a single removable copy.

ACQ-1 remains VOID (non-evaluable) under D-035. This backup preserves the records; it does not change their scientific status.

## What was backed up

| item | value |
|---|---|
| Source | `experiments/coga/data/`, git-ignored |
| Files | 1,306 files in 16 directories, 212,426,929 bytes |
| Contents | ACQ-1 confirmatory sessions, development sessions, run logs and related data files |
| Repository HEAD at backup | `ba29e86b148d5c8b65b86e175db4ea5eccac9e03` |

The source holds 14 per-directory manifests, which list 1,281 files. Every listed file appears in the new inventory with the same sha256: 0 missing, 0 mismatched. The remaining 25 files are those 14 manifest files and 11 files that no manifest lists. The new inventory covers all 1,306 files.

## Three copies, kept distinct

| copy | location | physical device | role |
|---|---|---|---|
| Original source data | `E:\Projects\OpenSourceLab\repos\mini-flywire\experiments\coga\data\` | Internal disk 0, WDC PC SN530 NVMe, partition E: | The live data; git-ignored |
| Local primary archive | `E:\Projects\OpenSourceLab\archives\coga\` | Same internal disk 0 | `tar.gz` of the source, outside the repository |
| USB backup | `F:\MiniFlyWire_Evidence_Backup\coga_data_ba29e86\` | Removable USB flash drive | Single removable copy |

## Files and hashes

| file | bytes | sha256 |
|---|---|---|
| `coga_data_raw_ba29e86.tar.gz` | 47,284,454 | `968aee302b66fee919f2e7c9664fedf96e973750321a1661774780db347a06eb` |
| `coga_data_inventory_ba29e86.sha256` | 138,504 | `5b9af0a91acb7e6878c17423e4ac775013ca700b4f5081103cfbc02f53779691` |
| `SHA256SUMS.txt` | 196 | `5819321943f9cbe1b496bdac19ff689fcf33f0837866033701974f75478fbd54` |

The inventory lists the sha256 of all 1,306 source files. `SHA256SUMS.txt` lists the archive and the inventory.

## USB identity

| field | value |
|---|---|
| Model | USB DISK 3.0 |
| Volume serial | `82B5036D` |
| Volume label, filesystem | `WINDOWS 10`, FAT32 |
| Volume size | 15,940,624,384 bytes |
| Drive letter at backup | F: |

A drive letter is not an identity. Another external device has also mounted as F: on this computer. Check the model and volume serial before reading or writing.

## Verification (FACT)

### Before disconnection, 2026-11-01

| check | result |
|---|---|
| USB identity, immediately before the first write | PASS |
| Destination paths absent; copy made with no overwrite | PASS |
| `sha256sum -c SHA256SUMS.txt` on the USB | PASS |
| Windows `Get-FileHash` on the archive and inventory | PASS |
| `cmp` of all 3 files against the local primary copies | PASS |
| `gzip -t` on the USB archive | PASS |
| USB archive extracted to a temporary folder, every file rehashed against the inventory | PASS: 1,306 of 1,306, 0 missing, 0 extra, 0 mismatched |
| `diff -rq` of the extracted tree against the source | PASS: 0 differences |
| Existing USB backups (blocks P, I, L and the LEARN-0 snapshot) | PASS: recorded checksums unchanged |

### After reconnection, 2026-11-01

The owner reported safely ejecting and reconnecting the drive. The Windows `Microsoft-Windows-Partition/Diagnostic` log, event 1006, recorded this model with capacity 0 at 02:06:58 and with capacity 15,958,474,752 bytes at 02:07:12, India Standard Time (UTC+05:30). Those entries show the device leaving and returning. They do not show who acted or how the removal was done; that part rests on the owner's report.

| check | result |
|---|---|
| USB identity | PASS |
| Archive sha256 | PASS |
| Inventory sha256 | PASS |
| `gzip -t` on the USB archive | PASS |
| `sha256sum -c SHA256SUMS.txt` | PASS |
| Inventory format: 1,306 lines, 0 malformed, 1,306 unique paths | PASS |
| Archive listing against inventory paths, without extraction | PASS: 1,306 file entries, identical path lists |
| `cmp` of all 3 files against the local primary copies | PASS |
| Existing USB backups (blocks P, I, L and the LEARN-0 snapshot) | PASS: recorded checksums unchanged |

**Not performed after reconnection:** extraction and per-file rehashing. Individual-file verification passed before disconnection only. Post-reconnection verification is at archive level: for individual files the evidence is indirect, because the archive hash is unchanged.

## Limitations

1. These checks cannot establish the USB drive's physical health. No SMART data was available. Matching hashes show only that the data read back correctly at the time.
2. The internal disk's SMART status was also unavailable. Its Windows "Healthy" status is not proof of health.
3. The source and the local primary archive share one physical disk, so they can fail together.
4. The USB backup is a single removable copy, on the same device as the earlier evidence backups.
5. When this record was prepared, the USB drive was still attached to this computer. Storage away from this computer is not confirmed.
6. This archive has no entry in `backup_manifest.json`, so `verify_backup_copy.mjs` reports it as UNKNOWN.
7. A temporary extract from the pre-disconnection check is not a backup and is not counted.

Nothing was uploaded, and no archive was committed to Git.

## Re-check later

In the backup folder, after confirming the USB identity:

    sha256sum -c SHA256SUMS.txt

## What this record does not do

- It does not change any earlier backup status, including the storage-away items recorded for earlier archives.
- It does not change any ACQ-1 record, frozen file, hash or scientific conclusion.
- It authorizes no new work.
