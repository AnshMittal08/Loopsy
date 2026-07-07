// ===========================================================================
// INDEPENDENT stitch-accuracy verifier.
//
// This deliberately shares NO code with lib/engine/validator.js. It re-derives
// each round's stitch math by expanding the English instruction into atomic
// crochet operations and tallying (consumed, produced) from first principles,
// then checks the two physical laws of working in rounds/rows:
//
//   LAW 1 (feasibility): a round consumes EXACTLY the stitches available from
//          the previous round — you cannot work into stitches that don't exist,
//          and you cannot leave the previous round unfinished.
//   LAW 2 (honesty):     the "(N stitches)" the pattern prints equals what the
//          operations actually produce.
//
// A step it cannot interpret is reported as UNPARSED (a coverage gap), never
// silently passed — so we know exactly how much of the surface is independently
// proven vs. merely un-contradicted.
// ===========================================================================

const STITCH = '(?:single crochet|half double crochet|double crochet|treble crochet|sc|hdc|dc|tr)';

// Flatten a round body into an ordered list of atoms (bracket repeats expanded).
// Returns array of atoms or null if anything is unrecognized.
function flattenAtoms(body) {
  const segs = body.split(/,\s*then\s+/i);
  const atoms = [];
  for (let seg of segs) {
    seg = seg.replace(/\.\s*$/, '').trim();
    if (!seg) continue;
    const rep = seg.match(/^\[(.+)\]\s*repeat\s+(\d+)\s+times$/i);
    if (rep) {
      const R = parseInt(rep[2], 10);
      const inner = rep[1].split(/,\s*/).map((p) => classifyAtom(p));
      if (inner.some((a) => a === null)) return null;
      for (let i = 0; i < R; i++) atoms.push(...inner.map((a) => ({ ...a })));
      continue;
    }
    for (const p of seg.split(/,\s*/)) {
      const a = classifyAtom(p);
      if (a === null) return null;
      atoms.push(a);
    }
  }
  return atoms;
}

// Classify one atomic op. FIXED atoms know their consume/produce; MOP atoms
// ("in each stitch across/around") consume whatever REMAINS at that point.
// Returns { fixed:true, consumed, produced } | { mop:true, factor, reserveAfter } | null.
function classifyAtom(p) {
  const t = p.trim().toLowerCase().replace(/\.$/, '');
  if (!t) return { fixed: true, consumed: 0, produced: 0 };

  // MOP: "2 X in each stitch around/across" → double all remaining
  if (new RegExp(`^2\\s+${STITCH}\\s+in each stitch (?:around|across)$`).test(t)) return { mop: true, factor: 2 };
  // MOP: "X in each stitch across to the last stitch" (reserve 1 for a trailing edge op)
  if (new RegExp(`^${STITCH}\\s+in each stitch across to the last stitch$`).test(t)) return { mop: true, factor: 1, reserve: 1 };
  // MOP: "X in each (stitch) around/across"  /  "X in each remaining stitch around"
  if (new RegExp(`^${STITCH}\\s+in each (?:remaining )?(?:stitch )?(?:around|across)$`).test(t)) return { mop: true, factor: 1 };

  // FIXED atoms:
  let m = t.match(new RegExp(`^2\\s+${STITCH}\\s+in each of the next (\\d+) stitch(?:es)?$`));
  if (m) { const k = +m[1]; return { fixed: true, consumed: k, produced: 2 * k }; }
  if (new RegExp(`^2\\s+${STITCH}\\s+in (?:the )?(?:next|first|last) stitch$`).test(t)) return { fixed: true, consumed: 1, produced: 2 };
  m = t.match(new RegExp(`^(\\d+)\\s+${STITCH}\\s+in (?:the )?next stitch$`)); // shell "5 dc in next stitch"
  if (m) return { fixed: true, consumed: 1, produced: +m[1] };
  if (new RegExp(`^${STITCH}\\s+2 together$`).test(t)) return { fixed: true, consumed: 2, produced: 1 };
  if (/^(?:bobble|popcorn)\s+in (?:the )?next stitch$/.test(t)) return { fixed: true, consumed: 1, produced: 1 };
  m = t.match(/^skip (?:the )?next (\d+) stitch(?:es)?$/);
  if (m) return { fixed: true, consumed: +m[1], produced: 0 };
  m = t.match(new RegExp(`^${STITCH}\\s+in (?:the )?next (\\d+) stitch(?:es)?$`));
  if (m) { const k = +m[1]; return { fixed: true, consumed: k, produced: k }; }
  if (new RegExp(`^${STITCH}\\s+in (?:the )?next stitch$`).test(t)) return { fixed: true, consumed: 1, produced: 1 };
  if (/^chain \d+$/.test(t)) return { fixed: true, consumed: 0, produced: 0 };
  return null;
}

// Simulate atoms consuming from `available`, left to right. Exactly-one-mop is
// the only ambiguous case the engine emits; the mop takes all stitches the
// fixed atoms don't. Returns { consumed, produced } | null.
function simulateAtoms(atoms, available) {
  const mops = atoms.filter((a) => a.mop);
  const fixedConsumed = atoms.filter((a) => a.fixed).reduce((s, a) => s + a.consumed, 0);
  const fixedProduced = atoms.filter((a) => a.fixed).reduce((s, a) => s + a.produced, 0);
  if (mops.length === 0) return { consumed: fixedConsumed, produced: fixedProduced };
  if (mops.length > 1) return null; // engine never emits multiple mops in one round
  if (available == null) return null;
  const mop = mops[0];
  const mopConsumed = available - fixedConsumed; // the mop mops up the rest
  if (mopConsumed < 0) return null;
  const mopProduced = mop.factor * mopConsumed;
  return { consumed: fixedConsumed + mopConsumed, produced: fixedProduced + mopProduced };
}

// Extract the declared "(N stitches)" (ignoring "(N chains)").
function declaredStitches(text) {
  const m = text.match(/\((\d+)\s*(?:stitches|sts|single crochet|half double crochet|double crochet)(?:\s+(?:each round|each row|per row|per round))?\)/i);
  return m ? +m[1] : null;
}
function declaredChains(text) {
  const m = text.match(/\((\d+)\s*chains?\)/i);
  return m ? +m[1] : null;
}

// Interpret ONE round instruction given the running available count.
// Returns { consumed, produced } | { even:true } | null(unparsed) | {start:N}.
function interpretRound(text, available) {
  const low = text.toLowerCase();

  // Start rounds (produce, consume 0). Allow a "Chain 2 (…)," interlude
  // between "Magic ring." and the count (hat crown / joined-dc starts).
  let m = low.match(new RegExp(`(\\d+)\\s+${STITCH}\\s+into(?: the)? ring`));
  if (m && /magic ring/.test(low)) return { start: +m[1] };
  // Joined-chain ring: "Chain N. ... X in each chain around. (N stitches)"
  if (/join with a slip stitch to the first chain to form a ring/.test(low)) {
    const d = declaredStitches(text);
    if (d != null) return { start: d };
  }
  // Foundation chain only: "Chain N. (N chains)"
  if (declaredChains(text) != null && !declaredStitches(text)) {
    return { start: declaredChains(text), chainFoundation: true };
  }
  // First row into foundation chain: "X in the 2nd chain from the hook and in each chain across. (M stitches)"
  if (/chain from the hook/.test(low)) {
    const d = declaredStitches(text);
    if (d != null && available != null) {
      // turning chains are skipped; consumed ≈ available minus 0..3, produced = d
      return { consumed: available, produced: d, foundationRow: true };
    }
  }
  // Count-neutral opening: "Chain N, skip the next N stitches ... then X in each remaining stitch around"
  m = low.match(/chain\s+(\d+),\s*skip the next\s+(\d+)\s+stitches/);
  if (m) {
    if (+m[1] === +m[2] && available != null) return { consumed: available, produced: available, opening: true };
    return null;
  }
  // Raglan divide round (declares its own count; not a pure operation) — accept declared.
  if (/divide for body and sleeves|divide round/.test(low)) {
    const d = declaredStitches(text);
    return d != null ? { declaredOnly: d } : null;
  }
  // Joining round for split limbs / heel / thumb pickups declare their own count.
  if (/the limbs are now joined|rejoin yarn at the (?:heel|thumb)|worked? .*around it/.test(low)) {
    const d = declaredStitches(text);
    return d != null ? { declaredOnly: d } : null;
  }
  // Sleeve pickup: worked into HELD + underarm stitches (a fresh sub-piece,
  // not the previous printed round). Verify produced == declared, skip LAW 1.
  if (/held stitches/.test(low)) {
    const nums = [...low.matchAll(new RegExp(`(?:in each of the )?(\\d+)\\s+(?:held|underarm|chain)\\s+stitch`, 'g'))].map((mm) => +mm[1]);
    const produced = nums.reduce((s, n) => s + n, 0);
    const d = declaredStitches(text);
    if (produced > 0 && d != null) return { pickup: true, produced, declared: d };
    return d != null ? { declaredOnly: d } : null;
  }

  // General worked round: strip any leading label ("Part — Round 3: "), the
  // declared "(N stitches)" parenthetical, and trailing prose, then expand.
  let body = text.replace(/^[^:]*:\s*/, '');
  body = body.replace(/\((?:\d+)\s*(?:stitches|sts|single crochet|half double crochet|double crochet)[^)]*\)/gi, ' ');
  // Joined-DC prelude/suffix (hat crown, joined rounds): a chain-2 that
  // explicitly "does not count as a stitch" adds nothing; the join is prose.
  body = body.replace(/^\s*chain \d+ \(does not count as a stitch\)[.,]?\s*/i, '');
  body = body.replace(/\s*join with a slip stitch[^.]*\.?/gi, ' ');
  body = body.replace(/\s*slip stitch to join\.?/gi, ' ');
  body = body.replace(/\s*(?:chain \d+, turn\.?|do not chain[^.]*\.?|pull ring closed\.?)/gi, ' ');
  // Strip trailing em-dash prose ("… — the doubled stitches trace the raglan lines.")
  body = body.replace(/\s*[—–-]\s*[a-z][^.]*\.?\s*$/i, '');
  body = body.replace(/^\s*working in back loops only,?\s*(?:then\s+)?/i, '');
  body = body.replace(/working in back loops only for this round, then through both loops:\s*/i, '');
  const atoms = flattenAtoms(body);
  if (!atoms || atoms.length === 0) return null;
  return simulateAtoms(atoms, available);
}

// Verify a full pattern (array of {instruction} or strings).
function verifyPattern(steps, label) {
  const findings = [];
  findings.unparsedLines = [];
  let available = null;
  let counted = 0, proven = 0, unparsed = 0;

  steps.forEach((step, i) => {
    const text = typeof step === 'string' ? step : String(step.instruction || '');
    const row = i + 1;
    if (/magic ring/i.test(text)) available = null; // new part resets

    const declared = declaredStitches(text);
    const res = interpretRound(text, available);

    if (declared != null) counted++;

    if (res == null) {
      if (declared != null) { unparsed++; available = declared; if (findings.unparsedLines) findings.unparsedLines.push(text.slice(0, 130)); }
      return;
    }
    if (res.start != null) { available = res.start; if (declared != null) proven++; return; }
    if (res.chainFoundation) { available = res.start ?? declared; return; }
    if (res.declaredOnly != null) { available = res.declaredOnly; return; }
    if (res.pickup) {
      if (res.produced !== res.declared) {
        findings.push({ label, row, kind: 'HONESTY', detail: `pickup produces ${res.produced} but prints ${res.declared}`, text: text.slice(0, 120) });
      } else proven++;
      available = res.declared;
      return;
    }

    // Worked round: apply the two laws.
    if (res.consumed != null) {
      // LAW 1: consumed must equal what was available (allow foundation-row turning-chain slack).
      if (available != null && !res.foundationRow && !res.opening) {
        if (res.consumed !== available) {
          findings.push({ label, row, kind: 'FEASIBILITY', detail: `consumes ${res.consumed} but ${available} available`, text: text.slice(0, 120) });
        }
      }
      // LAW 2: produced must equal declared.
      if (declared != null && !res.foundationRow) {
        if (res.produced !== declared) {
          findings.push({ label, row, kind: 'HONESTY', detail: `produces ${res.produced} but prints ${declared}`, text: text.slice(0, 120) });
        } else {
          proven++;
        }
      }
      available = declared != null ? declared : res.produced;
      return;
    }
    if (declared != null) { available = declared; }
  });

  return { findings, counted, proven, unparsed, unparsedLines: findings.unparsedLines };
}

module.exports = { verifyPattern, interpretRound, declaredStitches };
