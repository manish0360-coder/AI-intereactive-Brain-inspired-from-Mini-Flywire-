// ==========================================================
// R3 — SUSPEND regulateBiology's PERSISTENT WRITES DURING THE READOUT
// ==========================================================
// AUTHORITY
//   UQB-ERR-02, frozen at 59c2750, digest
//   88b9edbe8e7f4cb706c8a61400bd439fe64249e57facfc7446fa1168380786f3, §8 —
//   which corrects the ERR-01 closure claim and extends §15 to
//   render/behavior.js for this sole purpose.
//
// THE PROBLEM IT REPAIRS
//   `regulateBiology` (render/behavior.js:105-339) is called once per
//   `runPrediction` (main.js:2822) and writes NINE accumulating module-level
//   bindings. Five of them re-enter the scoring context at main.js:2107-2111 on
//   the NEXT call. A 19-state x 20-arrangement sweep therefore ages the agent
//   380 steps while zero actions execute — and because the driver iterates
//   arrangements outermost, arrangement 0, the observed identity, is always
//   measured at the least-aged state. Measured: J1 = 1/19 at 655fe42.
//
// WHY SNAPSHOT/RESTORE AND NOT 34 GUARDED STATEMENTS
//   The nine bindings are written by THIRTY-FOUR separate statements
//   (energyState 5, exhaustionState 6, stressState 7, confidenceState 4,
//   curiosityState 3, focusState 3, fatigueState 2, loopStressState 2,
//   restingState 2). Guarding each would be 34 fragile edits whose completeness
//   could only be argued. Capturing the nine at body entry and restoring them at
//   body exit is a few lines and is complete BY CONSTRUCTION: whatever the body
//   does to those bindings, they hold their pre-call values when it returns.
//
//   The committed function contains no `return`, so a restore placed before the
//   closing brace is reached on every path. The transform ASSERTS that rather
//   than assuming it, and refuses if a `return` ever appears.
//
// WHAT THIS CHANGES — persistence across calls, and nothing else
//   UQB-ERR-02 §4/§5: `regulateBiology` runs at main.js:2822, strictly AFTER
//   `bestChoice` is determined at :2365. It therefore cannot alter the value
//   measured in its own call — that is a STRUCTURAL property of the call
//   ordering, not an empirical one. This control only stops one readout from
//   perturbing the next.
//
// WHAT IT IS NOT
//   It is NOT a production architecture change and must never be described as
//   one. It does not claim that biological or cognitive state is irrelevant,
//   that `regulateBiology` is unimportant, or that the architecture would be
//   improved by its absence. Outside the guarded readout, biology regulates
//   exactly as committed. UQB-ERR-02 §8.
// ==========================================================

export const BIO_FUNCTION_OPEN = 'export function regulateBiology({';
export const BIO_GUARD = 'globalThis.__UQB_FREEZE_BIO__';

/** The nine persistent bindings, in the frozen snapshot order. */
export const BIO_STATES = Object.freeze([
    'curiosityState', 'confidenceState', 'stressState', 'fatigueState', 'focusState',
    'energyState', 'exhaustionState', 'restingState', 'loopStressState',
]);

/** Write-statement count in the committed function, pinned so drift is detected. */
export const BIO_WRITE_STATEMENTS = 34;

// `=(?!=)` rather than `=[^=]`, because several assignments are multi-line and
// put the `=` at end of line (`fatigueState =` at :193 and :335). A character
// class cannot match there. The lookahead still excludes `==` and `===`, and
// `!=`/`<=`/`>=` cannot match because the identifier must immediately precede.
const WRITE_RE = (name) =>
    new RegExp('(?<![A-Za-z0-9_$.])' + name + '\\s*(=(?!=)|\\+=|-=|\\*=|/=|\\+\\+|--)');

/**
 * Pure. Snapshots the nine bindings at `regulateBiology`'s body entry and
 * restores them at its exit, under the guard. With `__UQB_FREEZE_BIO__` unset
 * the snapshot is `null` and the restore never runs, so committed behaviour is
 * untouched.
 */
export function transformBehavior(source) {
    const raw = String(source);
    const crlf = raw.includes('\r\n');
    const text = crlf ? raw.replace(/\r\n/g, '\n') : raw;
    if (text.includes('\r')) {
        throw new Error('UQ-B: behavior.js contains a bare carriage return; only LF and CRLF ' +
            'terminators are recognised.');
    }
    const lines = text.split('\n');
    const clean = text.replace(/\/\*[\s\S]*?\*\//g, ' ').split('\n')
        .map(l => l.replace(/\/\/.*$/, ''));

    const decl = clean.findIndex(l => l.replace(/\s+$/, '') === BIO_FUNCTION_OPEN);
    if (decl < 0) {
        throw new Error(`UQ-B: could not locate ${JSON.stringify(BIO_FUNCTION_OPEN)} in ` +
            `render/behavior.js. The committed source moved; the transform refuses to guess.`);
    }

    // The destructured parameter list spans several lines; the body opens at `}) {`.
    let open = -1;
    for (let i = decl; i < Math.min(decl + 40, clean.length); i++) {
        if (/\}\)\s*\{\s*$/.test(clean[i])) { open = i; break; }
    }
    if (open < 0) {
        throw new Error("UQ-B: could not locate regulateBiology's body-opening `}) {`.");
    }

    let d = 0, seen = false, close = -1;
    for (let i = decl; i < clean.length; i++) {
        for (const ch of clean[i]) { if (ch === '{') { d++; seen = true; } else if (ch === '}') d--; }
        if (seen && d === 0) { close = i; break; }
    }
    if (close < 0) throw new Error("UQ-B: regulateBiology has no closing brace at column 0.");

    const body = clean.slice(open, close + 1);

    // A `return` would bypass a restore placed before the closing brace.
    if (body.some(l => /(?<![A-Za-z0-9_$.])return(?![A-Za-z0-9_$])/.test(l))) {
        throw new Error('UQ-B: regulateBiology now contains a `return`; a restore before the ' +
            'closing brace would not be reached on every path. The transform refuses.');
    }

    // Every one of the nine must actually be written here, and the statement
    // count is pinned, so a change in the write structure is detected.
    let statements = 0;
    for (const l of body) for (const s of BIO_STATES) if (WRITE_RE(s).test(l)) statements++;
    const unwritten = BIO_STATES.filter(s => !body.some(l => WRITE_RE(s).test(l)));
    if (unwritten.length) {
        throw new Error(`UQ-B: ${unwritten.join(', ')} is no longer written by regulateBiology; ` +
            `the snapshot set is not the set UQB-ERR-02 §8 authorised.`);
    }
    if (statements !== BIO_WRITE_STATEMENTS) {
        throw new Error(`UQ-B: regulateBiology contains ${statements} write statements, expected ` +
            `${BIO_WRITE_STATEMENTS}. Its write structure changed.`);
    }

    // No OTHER top-level binding of this module may be written here, or the
    // restore would leave a mutation behind.
    let dd = 0; const tops = [];
    for (const l of clean) {
        if (dd === 0) {
            const m = l.match(/^(export\s+)?(let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
            if (m) tops.push(m[3]);
        }
        for (const ch of l) { if (ch === '{') dd++; else if (ch === '}') dd--; }
    }
    const stray = tops.filter(t => !BIO_STATES.includes(t) && body.some(l => WRITE_RE(t).test(l)));
    if (stray.length) {
        throw new Error(`UQ-B: regulateBiology also writes ${stray.join(', ')}, which the snapshot ` +
            `does not cover. Restoring only the nine would leave a mutation behind.`);
    }

    const snap = `    const __UQB_BIO = ${BIO_GUARD} ? [${BIO_STATES.join(', ')}] : null;`;
    const rest = [
        '    if (__UQB_BIO) {',
        '        ' + BIO_STATES.slice(0, 5).map((s, i) => `${s} = __UQB_BIO[${i}];`).join(' '),
        '        ' + BIO_STATES.slice(5).map((s, i) => `${s} = __UQB_BIO[${i + 5}];`).join(' '),
        '    }',
    ];

    const out = lines.slice();
    out.splice(close, 0, ...rest);      // before the closing brace
    out.splice(open + 1, 0, snap);      // after the body-opening brace
    return out.join(crlf ? '\r\n' : '\n');
}

/** The audited line numbers in the committed source, for reporting. */
export function bioLines(source) {
    const text = String(source).replace(/\r\n/g, '\n');
    const clean = text.replace(/\/\*[\s\S]*?\*\//g, ' ').split('\n')
        .map(l => l.replace(/\/\/.*$/, ''));
    const decl = clean.findIndex(l => l.replace(/\s+$/, '') === BIO_FUNCTION_OPEN);
    let open = -1;
    for (let i = decl; i < Math.min(decl + 40, clean.length); i++) {
        if (/\}\)\s*\{\s*$/.test(clean[i])) { open = i; break; }
    }
    let d = 0, seen = false, close = -1;
    for (let i = decl; i < clean.length; i++) {
        for (const ch of clean[i]) { if (ch === '{') { d++; seen = true; } else if (ch === '}') d--; }
        if (seen && d === 0) { close = i; break; }
    }
    return { decl: decl + 1, open: open + 1, close: close + 1 };
}
