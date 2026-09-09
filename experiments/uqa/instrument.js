// ==========================================================
// UQ-A EXPOSURE — the E-BOTH ablation, by source transform
// ==========================================================
// SOLE SCIENTIFIC AUTHORITY
//   UQA_PREREGISTRATION.md §5 (exposure) and §15 (neutrality), frozen at
//   63247bb, digest 03eba04ac908861332fb2d7b0d3c0994468e1bd5ab5f78a5acf092dcd20196c4.
//
// WHAT THIS DOES
//   §5 ARMED   : the committed behaviour, unchanged.
//   §5 ABLATED : `uncertaintyScore` delivered as exactly 0 at BOTH frozen read
//                sites — scoring.js:151 (via main.js:2073) and
//                executiveController.js:145 (via main.js:2245).
//
// WHY ONE ANCHOR SUFFICES, and why that is exactly §5 and not more
//   Both frozen read sites consume the SAME local, `uncertaintyScoreValue`,
//   assigned once at main.js:2045-2046. Source audit establishes that this
//   identifier occurs at exactly three places: its assignment (2045), the
//   scoring call (2073) and the arbitrate call (2245). Neutralising the
//   assignment therefore delivers 0 to both sites and to nothing else. The
//   transform asserts that three-occurrence fact rather than assuming it.
//
// THE CALL IS PRESERVED
//   The transform keeps `getUncertaintyScore(candidatePathKey)` and discards
//   its value via the comma operator. Source audit establishes the function is
//   pure — it reads surpriseMap, inconsistencyMap and visitCount and mutates
//   nothing — so preserving the call changes no state. It is preserved anyway
//   so that the ARMED and ABLATED builds execute the same call sequence and
//   differ ONLY in the delivered value, which is what §5 specifies.
//
// TRAILING WHITESPACE AND LINE ENDINGS
//   The committed main.js:2046 ends with three trailing spaces, and on a fresh
//   clone under core.autocrlf=true the whole file materialises with CRLF line
//   endings. Both are semantically void in JavaScript, so the anchor is matched
//   on the line's trailing-trimmed form. Leading indentation is NOT trimmed: it
//   is part of the structural identity being asserted. A comparison that also
//   trimmed the left would match a line of the same text in a different block.
//
//   The transform does NOT normalise line endings. It splices one line into the
//   original text and leaves every other byte, including that line's own
//   terminator, exactly as the loader handed it over. So ARMED stays
//   byte-identical to the file on disk on every platform, and ABLATED differs
//   from it on exactly one line's content and nowhere else. An earlier version
//   refused CRLF outright; that made the study unrunnable from a fresh clone,
//   which the clean-tree verification caught.
//
// NEUTRALITY (§15)
//   No production source is modified. The transform runs in memory through an
//   ESM load hook, the Q1-proven technique. With the hook unregistered, main.js
//   is byte-identical to HEAD. The transform introduces no branch, no RNG draw,
//   no async boundary, and no write to agent or environment state.
//
// FAILS CLOSED
//   A missing, duplicated, or structurally moved anchor throws. A silently
//   skipped ablation would produce an ARMED run mislabelled ABLATED, which is
//   the worst failure this experiment could have.
// ==========================================================

// The committed text of main.js:2046, trailing whitespace excluded (see above).
export const ANCHOR = '      getUncertaintyScore(candidatePathKey);';

// §5: deliver exactly 0. The call is kept; only its value is discarded.
export const ABLATED_LINE = '      (getUncertaintyScore(candidatePathKey), 0);';

// The identifier both frozen read sites consume.
export const EXPOSURE_IDENTIFIER = 'uncertaintyScoreValue';

// Structural pin: the line immediately above the anchor in committed main.js.
// Uniqueness alone would not catch an anchor that survived textually but moved
// into a different enclosing block.
export const ANCHOR_PRECEDED_BY = 'const uncertaintyScoreValue =';

// The exposure identifier must occur exactly this many times: the assignment
// and the two frozen read sites. More would mean the ablation reaches somewhere
// §5 did not authorise; fewer would mean a read site vanished.
export const EXPECTED_IDENTIFIER_OCCURRENCES = 3;

/**
 * Pure. `arm` is 'ARMED' or 'ABLATED'.
 * ARMED returns the source unchanged — the committed behaviour, byte-identical.
 */
export function transform(source, arm) {
    if (arm !== 'ARMED' && arm !== 'ABLATED') {
        throw new Error(`UQ-A: arm must be ARMED or ABLATED, got ${arm}`);
    }
    const text = String(source);

    // Line spans over the ORIGINAL text: [start, contentEnd). The terminator,
    // whether "\n" or "\r\n" or absent at end of file, lies outside the span and
    // is therefore never rewritten.
    const spans = [];
    for (let i = 0, start = 0; i <= text.length; i++) {
        if (i === text.length || text[i] === '\n') {
            let end = i;
            if (end > start && text[end - 1] === '\r') end--;
            if (!(i === text.length && start === i)) spans.push([start, end]);
            start = i + 1;
        }
    }
    const lineAt = (k) => text.slice(spans[k][0], spans[k][1]);

    const hits = [];
    for (let i = 0; i < spans.length; i++) {
        if (lineAt(i).replace(/\s+$/, '') === ANCHOR) hits.push(i);
    }
    if (hits.length !== 1) {
        throw new Error(`UQ-A: exposure anchor matched ${hits.length} lines, expected exactly 1: ` +
            `${JSON.stringify(ANCHOR)}`);
    }
    const at = hits[0];
    const above = at > 0 ? lineAt(at - 1).trim() : null;
    if (above !== ANCHOR_PRECEDED_BY) {
        throw new Error(`UQ-A: exposure structural pin failed. Expected the line above the anchor ` +
            `to be ${JSON.stringify(ANCHOR_PRECEDED_BY)}, found ${JSON.stringify(above)}.`);
    }

    const occurrences = text.split(EXPOSURE_IDENTIFIER).length - 1;
    if (occurrences !== EXPECTED_IDENTIFIER_OCCURRENCES) {
        throw new Error(`UQ-A: "${EXPOSURE_IDENTIFIER}" occurs ${occurrences} times, expected ` +
            `${EXPECTED_IDENTIFIER_OCCURRENCES} (assignment + two frozen read sites). ` +
            `The exposure would not be E-BOTH.`);
    }

    if (arm === 'ARMED') return text;

    // Surgical splice: replace only the anchor line's CONTENT. Everything before
    // it, everything after it, and its own terminator are untouched.
    return text.slice(0, spans[at][0]) + ABLATED_LINE + text.slice(spans[at][1]);
}
