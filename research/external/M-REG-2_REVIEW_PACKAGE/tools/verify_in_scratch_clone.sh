#!/usr/bin/env bash
# M-REG-2 review package: reproduce the proposed commit sequence in a SCRATCH CLONE of the exact current HEAD and run the
# gates after every commit.  Nothing in <repo> is modified: the clone is made with git clone, and the git-ignored scan
# artifacts are only copied from.
#
# usage: verify_in_scratch_clone.sh <repo> <work> <package> [<scan-artifacts-dir>]
#   <repo>     the checkout whose HEAD is cloned (read only); its HEAD must be the pinned commit below
#   <work>     a path that does not exist yet, OUTSIDE the OS temporary directory and outside <repo>
#              (a clone inside the temporary directory makes verify_scan's w.real_destination check fail)
#   <package>  this package's directory (holds patches/ and the helper scripts)
#   <scan-artifacts-dir>  optional: <repo>/experiments/mcf1/data/scan (copied into the clone's git-ignored data directory;
#              also enables stage S1, the evidence-lodging commit)
# environment: NOART_PASS=1 adds a final pass of verify_scan and verify_mcf1 with the artifacts removed from the clone.
set -u
EXPECT_HEAD=a42e1d9323903ac7536be3231adca0021e713d94
if [ $# -lt 3 ]; then echo "usage: $0 <repo> <work> <package> [<scan-artifacts-dir>]"; exit 2; fi
REPO=$(cd "$1" && pwd); WORK=$2; PKG=$(cd "$3" && pwd); ART=${4:-}
[ -e "$WORK" ] && { echo "refused: $WORK already exists"; exit 2; }
mkdir -p "$WORK" || exit 2
WORK=$(cd "$WORK" && pwd)
node -e "const p=require('path'),o=require('os'),f=require('fs');const w=f.realpathSync(process.argv[1]).toLowerCase(),t=f.realpathSync(o.tmpdir()).toLowerCase();process.exit(w===t||w.startsWith(t+p.sep)?1:0)" "$WORK" \
  || { echo "refused: <work> is inside the OS temporary directory"; exit 2; }
CLONE="$WORK/clone"; LOGS="$WORK/logs"; mkdir -p "$LOGS"

echo "== clone of the exact HEAD =="
git -c core.autocrlf=false -c core.eol=lf clone -q --no-hardlinks "$REPO" "$CLONE" || exit 2
cd "$CLONE" || exit 2
git checkout -q --detach "$EXPECT_HEAD" || { echo "the repository does not contain $EXPECT_HEAD"; exit 2; }
git config core.autocrlf false; git config core.eol lf
git config user.name scratch; git config user.email scratch@example.invalid
[ "$(git rev-parse HEAD)" = "$EXPECT_HEAD" ] || exit 2
BAD=$(git ls-files --eol | awk '$1=="i/lf" && $2=="w/crlf"' | wc -l)
echo "HEAD $(git rev-parse HEAD); tracked files $(git ls-files | wc -l); working-tree line endings differing from the blobs: $BAD"
[ "$BAD" = "0" ] || { echo "refused: the clone is not byte-faithful"; exit 2; }
if [ -n "$ART" ]; then mkdir -p experiments/mcf1/data && cp -r "$ART" experiments/mcf1/data/scan; fi

summarize() {   # <label> <name> <regex>
  printf '%-4s %-14s exit %-2s  %s\n' "$1" "$2" "$(cat "$LOGS/$1_$2.rc")" "$(grep -h -E "$3" "$LOGS/$1_$2.log" | tail -1 | sed 's/^ *//' | cut -c1-150)"
}
run_gates() {   # <label>
  local label=$1
  ( node experiments/registry/verify_registry.js > "$LOGS/${label}_registry.log" 2>&1; echo $? > "$LOGS/${label}_registry.rc" ) &
  ( node experiments/mcf1/verify_scan.mjs        > "$LOGS/${label}_scan.log" 2>&1;     echo $? > "$LOGS/${label}_scan.rc" ) &
  ( node experiments/mcf1/verify_mcf1.mjs        > "$LOGS/${label}_mcf1.log" 2>&1;     echo $? > "$LOGS/${label}_mcf1.rc" ) &
  ( node experiments/mcf1/verify_r2.mjs          > "$LOGS/${label}_r2.log" 2>&1;       echo $? > "$LOGS/${label}_r2.rc" ) &
  ( node experiments/m33/verify_r1.js            > "$LOGS/${label}_m33.log" 2>&1;      echo $? > "$LOGS/${label}_m33.rc" ) &
  ( node experiments/h1r/build_identity.mjs --check > "$LOGS/${label}_buildidentity.log" 2>&1; echo $? > "$LOGS/${label}_buildidentity.rc" ) &
  wait
  node "$PKG/tools/identities.mjs" "$CLONE" > "$LOGS/${label}_identities.json" 2>&1
  summarize "$label" registry 'REGISTRY GATES'
  summarize "$label" scan '^RESULT'
  summarize "$label" mcf1 '^RESULT'
  summarize "$label" r2 '^RESULT'
  summarize "$label" m33 'VERIFY:'
  summarize "$label" buildidentity 'BUILD_IDENTITY'
}
apply_commit() {   # <patch> <message>
  git apply --check "$1" || { echo "the patch does not apply: $1"; exit 2; }
  git apply "$1" && git add -A -- experiments && git commit -q -m "$2" || exit 2
  echo "commit $(git rev-parse --short HEAD): $2"; git show --stat --format= HEAD | tail -4
}

echo; echo "== S0: exact HEAD, nothing applied =="
run_gates S0

if [ -n "$ART" ]; then
  echo; echo "== S1: C0, lodge the evidence (admitted.json and its digest, byte-exact) =="
  D=experiments/mcf1/scan_records/1500000000-4000
  mkdir -p "$D"
  cp "$ART/1500000000-4000/admitted.json" "$ART/1500000000-4000/admitted.json.sha256" "$D/"
  printf '* -text\n' > "$D/.gitattributes"
  [ "$(sha256sum "$D/admitted.json" | cut -d' ' -f1)" = "$(tr -d '\r\n' < "$D/admitted.json.sha256")" ] || { echo "the lodged digest does not match"; exit 2; }
  git add -A -- experiments && git commit -q -m "scratch C0: lodge the candidate admission evidence" || exit 2
  echo "commit $(git rev-parse --short HEAD); lodged: $(git ls-files "$D" | tr '\n' ' ')"
  run_gates S1
fi

echo; echo "== S2: C1, verifier preparation (state-aware assertions; the block module is still empty) =="
apply_commit "$PKG/patches/C1_verifier_prep.patch" "scratch C1: make the block assertions state-aware"
run_gates S2

echo; echo "== S3: C2, register the block (draft wording) =="
apply_commit "$PKG/patches/C2_register_block.patch" "scratch C2: register the MCF-1 candidate block"
run_gates S3
echo; echo "-- independent module check (no repository code involved)"
if [ -n "$ART" ]; then node "$PKG/tools/check_block_module.mjs" experiments/registry/trajectory_blocks.js "$ART/1500000000-4000/admitted.json" | tr -d '\n ' ; echo
else node "$PKG/tools/check_block_module.mjs" experiments/registry/trajectory_blocks.js | tr -d '\n ' ; echo; fi

if [ "${NOART_PASS:-0}" = "1" ] && [ -d experiments/mcf1/data/scan ]; then
  echo; echo "== S3b: the same state with the git-ignored scan artifacts removed =="
  mv experiments/mcf1/data/scan "$WORK/scan_aside"
  ( node experiments/mcf1/verify_scan.mjs > "$LOGS/S3b_scan.log" 2>&1; echo $? > "$LOGS/S3b_scan.rc" ) &
  ( node experiments/mcf1/verify_mcf1.mjs > "$LOGS/S3b_mcf1.log" 2>&1; echo $? > "$LOGS/S3b_mcf1.rc" ) &
  wait
  summarize S3b scan '^RESULT'; summarize S3b mcf1 '^RESULT'
  mv "$WORK/scan_aside" experiments/mcf1/data/scan
fi

echo; echo "== identities per stage =="
for f in "$LOGS"/S*_identities.json; do echo "-- $(basename "$f")"; tr -d '\n ' < "$f"; echo; done
echo; echo "clone: $CLONE   logs: $LOGS"
echo "official repository untouched: $(cd "$REPO" && git status --porcelain --untracked-files=no | wc -l) tracked changes"
