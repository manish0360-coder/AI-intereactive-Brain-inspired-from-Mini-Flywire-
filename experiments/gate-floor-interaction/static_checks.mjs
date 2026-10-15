// ==========================================================
// GATE-FLOOR-INTERACTION — static source invariants (pure functions over source text; no I/O)
// ==========================================================
// S5 (design report §2): `window.lastReasoning` is never CLEARED in the pinned derived HEAD source.  The EXEC guard's firings
// (~29 per session in the development calibration) are interpreted as stale pre-reset reasoning executed from a new position;
// that reading needs the structural fact that nothing at HEAD resets the reasoning at an episode boundary (the H1-R P4 edit does).
//
// The invariant is STRUCTURAL, not a text search for one spelling: after comments are stripped, every WRITE to the symbol
// (plain / compound / logical-assignment, `window.` / `globalThis.` / `self.` qualified or bare, and bracket forms), every
// `delete`, every `Object.defineProperty`-style redefinition and every property write on the object is collected, and the
// invariant is that the ONLY write is a single assignment whose right-hand side opens an object literal (the decision's own
// `{ from, to, ... }` record).  A clearing operation of any shape (`= null`, `= undefined`, `= false`, `= 0`, `= ''`, `= []`,
// `delete ...`, a second assignment, a redefinition, a property reset) therefore changes the collected set and fails the check.
// ==========================================================

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');

const QUAL = String.raw`(?:\b(?:window|globalThis|self)\s*\.\s*)?`;
const SYM = String.raw`(?:\blastReasoning\b|\[\s*['"\`]lastReasoning['"\`]\s*\])`;
const ASSIGN = String.raw`(?:=(?!=)|\+=|-=|\*=|\/=|\|\|=|&&=|\?\?=)`;

/** every write-like operation on lastReasoning in the (comment-stripped) source, in source order */
export function lastReasoningWrites(text) {
  const code = stripComments(text);
  const ops = [];
  const lineOf = (i) => code.slice(0, i).split('\n').length;
  const take = (re, kind, rhs = false) => {
    let m;
    while ((m = re.exec(code)) !== null) {
      const after = code.slice(m.index + m[0].length).replace(/^\s+/, '');
      ops.push({ kind, line: lineOf(m.index), objectLiteral: rhs ? after.startsWith('{') : null, text: m[0].replace(/\s+/g, ' ').trim() });
    }
  };
  take(new RegExp(String.raw`${QUAL}${SYM}\s*${ASSIGN}`, 'g'), 'assign', true);
  take(new RegExp(String.raw`\bdelete\s+${QUAL}${SYM}`, 'g'), 'delete');
  take(new RegExp(String.raw`\b(?:Object\.(?:defineProperty|defineProperties|assign|setPrototypeOf)|Reflect\.(?:set|defineProperty|deleteProperty))\s*\([^;]*\blastReasoning\b`, 'g'), 'redefine');
  take(new RegExp(String.raw`${QUAL}${SYM}\s*(?:\.\s*\w+|\[[^\]]+\])\s*${ASSIGN}`, 'g'), 'propertyWrite');
  take(new RegExp(String.raw`\b(?:\+\+|--)\s*${QUAL}${SYM}|${QUAL}${SYM}\s*(?:\+\+|--)`, 'g'), 'update');
  ops.sort((a, b) => a.line - b.line);
  return ops;
}

/** the S5 invariant: exactly one write, and it is the object-literal decision record */
export function lastReasoningInvariant(text) {
  const ops = lastReasoningWrites(text);
  const problems = [];
  const assigns = ops.filter(o => o.kind === 'assign');
  const others = ops.filter(o => o.kind !== 'assign');
  if (assigns.length !== 1) problems.push(`expected exactly one assignment to lastReasoning, found ${assigns.length}`);
  for (const a of assigns) if (!a.objectLiteral) problems.push(`line ${a.line}: assignment whose right-hand side is not an object literal (${a.text})`);
  for (const o of others) problems.push(`line ${o.line}: ${o.kind} on lastReasoning (${o.text})`);
  return { ok: problems.length === 0, problems, writes: ops };
}
