// ---------------------------------------------------------------------------
// Pattern Validator — parse a pattern's steps, recompute running stitch
// counts, and flag drift between what a step claims "(24 stitches)" and what
// the arithmetic says.
//
// Conservative by design: a step the parser cannot model is skipped, never
// guessed. The "Verified math ✓" badge is only earned when enough steps were
// checkable AND none of them disagreed.
// ---------------------------------------------------------------------------

const STITCH_WORDS = '(?:single crochet|half double crochet|double crochet|treble crochet|sc|hdc|dc)';

/** Extract the declared count from "(24 stitches)" / "(20 single crochet per row)" etc. */
function declaredCount(text) {
  const match = text.match(
    /\((\d+)\s*(?:stitches|sts|single crochet|half double crochet|double crochet|chains)(?:\s+(?:each round|each row|per row|per round|total))?\)/i
  );
  return match ? parseInt(match[1], 10) : null;
}

// Parse one increase segment ("[sc in next 3, 2 sc in next] repeat 5 times",
// "2 sc in each of the next 4 stitches", "sc in next 50, 2 sc in the next
// stitch", "2 sc in the next stitch") → stitches consumed and produced.
function parseIncSeg(seg) {
  const reM = seg.match(/repeat\s+(\d+)\s+times/);
  // Raglan idiom: "sc in next K stitches, 2 sc in each of the next M stitches"
  // (repeated R times) → consumed R×(K+M), produced R×(K+2M).
  let m = seg.match(
    new RegExp(
      `${STITCH_WORDS}\\s+in\\s+(?:the\\s+)?next(?:\\s+(\\d+))?\\s+stitch(?:es)?,\\s*2\\s+${STITCH_WORDS}\\s+in\\s+each\\s+of\\s+the\\s+next\\s+(\\d+)\\s+stitches`
    )
  );
  if (m) {
    const plain = m[1] ? parseInt(m[1], 10) : 1;
    const doubled = parseInt(m[2], 10);
    const units = reM ? parseInt(reM[1], 10) : 1;
    return { consumed: units * (plain + doubled), produced: units * (plain + 2 * doubled) };
  }
  m = seg.match(new RegExp(`2\\s+${STITCH_WORDS}\\s+in\\s+each\\s+of\\s+the\\s+next\\s+(\\d+)\\s+stitches`));
  if (m) { const units = parseInt(m[1], 10); return { consumed: units, produced: 2 * units }; }
  if (new RegExp(`2\\s+${STITCH_WORDS}\\s+in\\s+(?:the\\s+)?next\\s+stitch`).test(seg)) {
    const km = seg.match(new RegExp(`${STITCH_WORDS}\\s+in\\s+(?:the\\s+)?next\\s+(\\d+)\\s+stitch`));
    const plain = km ? parseInt(km[1], 10)
      : (new RegExp(`${STITCH_WORDS}\\s+in\\s+(?:the\\s+)?next\\s+stitch\\s*,`).test(seg) ? 1 : 0);
    const units = reM ? parseInt(reM[1], 10) : 1;
    return { consumed: units * (plain + 1), produced: units * (plain + 2) };
  }
  return null;
}

// Parse one decrease segment → consumed / produced.
function parseDecSeg(seg) {
  if (!/2\s+together|2tog|decrease/.test(seg)) return null;
  const reM = seg.match(/repeat\s+(\d+)\s+times/);
  const km = seg.match(new RegExp(`${STITCH_WORDS}\\s+in\\s+(?:the\\s+)?next\\s+(\\d+)\\s+stitch`));
  const plain = km ? parseInt(km[1], 10)
    : (new RegExp(`${STITCH_WORDS}\\s+in\\s+(?:the\\s+)?next\\s+stitch\\s*,`).test(seg) ? 1 : 0);
  const units = reM ? parseInt(reM[1], 10) : 1;
  return { consumed: units * (plain + 2), produced: units * (plain + 1) };
}

// General shaping round: sum every increase/decrease segment (joined by
// ", then "). Returns the new count, or null if it can't fully account for the
// round (so it's skipped, never mis-flagged).
function evalShaping(t, prev) {
  if (prev == null) return null;
  const isDec = /2\s+together|2tog|decrease/.test(t);
  const isInc = !isDec && new RegExp(`2\\s+${STITCH_WORDS}\\s+in`).test(t);
  if (!isInc && !isDec) return null;
  if (isInc && new RegExp(`2\\s+${STITCH_WORDS}\\s+in\\s+each\\s+stitch\\s+around`).test(t)) return prev * 2;

  const segments = t.split(/,\s*then\s+/);
  let consumed = 0, produced = 0;
  for (const seg of segments) {
    const r = isInc ? parseIncSeg(seg) : parseDecSeg(seg);
    if (!r) return null; // a segment we can't model → don't guess
    consumed += r.consumed;
    produced += r.produced;
  }
  return consumed === prev ? produced : null;
}

/**
 * Given the instruction text and the previous running count, compute the
 * expected count. Returns null when the operation isn't recognized.
 */
function computeExpectedCount(text, prev) {
  const t = text.toLowerCase();

  // Cluster/corner rounds (granny squares, shells) are not modelled — skip
  // rather than guess. The declared count is adopted as the running count.
  // (Match both "into ring" and "in ring" phrasings.)
  if (/corner/.test(t) || (/\[/.test(t) && /in(?:to)?\s+(?:the\s+)?ring/.test(t))) return null;

  // Joined double-crochet rounds where "chain 3 counts as a stitch" use a
  // convention with prelude stitches the parser cannot reliably model.
  if (/slip stitch/.test(t) && /chain\s*3/.test(t)) return null;

  // Texture rounds (E2) — count-neutral by construction, derived exactly.
  // Bobble/popcorn: "[Bobble in next stitch, sc in next 3 stitches] repeat 6 times."
  // consumed = produced = reps × (spacing + 1); must equal the running count.
  let tm = t.match(
    new RegExp(
      `\\[(?:bobble|popcorn)\\s+in\\s+(?:the\\s+)?next\\s+stitch,\\s*${STITCH_WORDS}\\s+in\\s+(?:the\\s+)?next(?:\\s+(\\d+))?\\s+stitch(?:es)?\\]\\s+repeat\\s+(\\d+)\\s+times`
    )
  );
  if (tm) {
    const spacing = tm[1] ? parseInt(tm[1], 10) : 1;
    const reps = parseInt(tm[2], 10);
    const total = reps * (spacing + 1);
    return prev == null || total === prev ? total : null;
  }
  // Shell: "[Skip next 2 stitches, 5 double crochet in next stitch, skip next
  // 2 stitches, single crochet in next stitch] repeat R times." → 6 per repeat.
  tm = t.match(
    /\[skip\s+(?:the\s+)?next\s+2\s+stitches,\s*5\s+double\s+crochet\s+in\s+(?:the\s+)?next\s+stitch,\s*skip\s+(?:the\s+)?next\s+2\s+stitches,\s*(?:single crochet|sc)\s+in\s+(?:the\s+)?next\s+stitch\]\s+repeat\s+(\d+)\s+times/
  );
  if (tm) {
    const total = 6 * parseInt(tm[1], 10);
    return prev == null || total === prev ? total : null;
  }

  // Magic ring start: "Magic ring. 6 single crochet into ring."
  let m = t.match(new RegExp(`magic ring[^.]*?(\\d+)\\s+${STITCH_WORDS}\\s+into(?:\\s+the)?\\s+ring`));
  if (m) return parseInt(m[1], 10);
  m = t.match(new RegExp(`(\\d+)\\s+${STITCH_WORDS}\\s+(?:into|in)(?:\\s+the)?\\s+(?:magic\\s+)?ring`));
  if (m) return parseInt(m[1], 10);

  // General shaping round — increases and/or decreases, single or multi-segment.
  const shaped = evalShaping(t, prev);
  if (shaped != null) return shaped;

  // Row-edge shaping (flat pieces worked in rows — triangles, hearts, wings).
  // These must be derived BEFORE the even-row fallback, which would otherwise
  // match the "…in each stitch across" tail and mis-expect an unchanged count.
  if (prev != null && !/repeat/.test(t) && !/\[/.test(t)) {
    // Halving round: "Sc 2 together around." — every pair merged → prev / 2
    // (only derivable when the running count is even).
    if (new RegExp(`${STITCH_WORDS}\\s+2\\s+together\\s+around\\b`).test(t)) {
      return prev % 2 === 0 ? prev / 2 : null;
    }
    // Edge decrease: "Sc 2 together, then sc in each stitch across." → prev − 1.
    // Compiled steps carry a "Part — Row N: " prefix, so anchor at the start OR
    // immediately after that label colon. Never matches the "around" form above.
    if (new RegExp(`(?:^|:\\s+)${STITCH_WORDS}\\s+2\\s+together\\b(?!\\s+around)`).test(t)) {
      return prev - 1;
    }
    // Double edge increase:
    // "2 sc in the first stitch, sc across to the last stitch, 2 sc in the last stitch." → prev + 2
    if (
      new RegExp(`2\\s+${STITCH_WORDS}\\s+in\\s+the\\s+first\\s+stitch`).test(t) &&
      new RegExp(`2\\s+${STITCH_WORDS}\\s+in\\s+the\\s+last\\s+stitch`).test(t)
    ) {
      return prev + 2;
    }
  }

  // Count-neutral opening (E3 garments): "Chain N, skip the next N stitches …"
  // — a thumb/heel gap bridged by the same number of chains, so the running
  // count is unchanged. Only derived when the two numbers agree.
  tm = t.match(/chain\s+(\d+),\s*skip\s+the\s+next\s+(\d+)\s+stitches/);
  if (tm) {
    return prev != null && tm[1] === tm[2] ? prev : null;
  }

  // Even round/row: "single crochet in each stitch around/across",
  // "single crochet across", "repeat the same row"
  if (
    new RegExp(`${STITCH_WORDS}\\s+(?:in\\s+each\\s+stitch\\s+)?(?:around|across)`).test(t) ||
    /repeat(?:ing)?\s+(?:the\s+same\s+row|row\s+\d+)/.test(t)
  ) {
    return prev;
  }

  // Foundation chain: "Chain 21 … (21 chains)" — only checked when the step's
  // declared unit is chains, so a row that chains AND works stitches is never
  // compared against the wrong number.
  m = t.match(/chain\s+(\d+)(?:\s+stitches)?\b/);
  if (m && /\(\s*\d+\s*chains?\s*\)/.test(t)) {
    return parseInt(m[1], 10);
  }

  // First row into a foundation chain:
  // "single crochet in 2nd chain from hook and in each chain (across)"
  if (
    new RegExp(`${STITCH_WORDS}\\s+in(?:to)?\\s+(?:the\\s+)?\\d+(?:st|nd|rd|th)\\s+chain\\s+from\\s+(?:the\\s+)?hook`).test(t) &&
    /each\s+(?:remaining\s+)?chain(?:\s+across)?/.test(t)
  ) {
    // Standard: chains minus turning chain(s). sc = 1, but we can't always
    // know the stitch's turning chain — accept prev-1 .. prev-3.
    return prev != null ? { min: prev - 3, max: prev - 1 } : null;
  }

  return null;
}

/**
 * Validate a pattern's steps.
 *
 * @param {Array<{row?: number, instruction: string}|string>} steps
 * @returns {{
 *   verified: boolean,
 *   checkedSteps: number,
 *   countedSteps: number,
 *   issues: Array<{ row: number, expected: number|string, declared: number, instruction: string }>
 * }}
 */
function validatePattern(steps) {
  const issues = [];
  let running = null;
  let checkedSteps = 0;
  let countedSteps = 0;

  const list = (steps || []).map((step, index) => ({
    row: typeof step === 'object' && step.row != null ? step.row : index + 1,
    text: typeof step === 'string' ? step : String(step.instruction || ''),
  }));

  for (const { row, text } of list) {
    const declared = declaredCount(text);

    // Part boundaries reset the running count ("Head — Round 1: Magic ring…",
    // a new "Chain N" foundation, or an explicit magic ring restart).
    if (/magic ring/i.test(text)) running = null;

    const expected = computeExpectedCount(text, running);

    if (declared != null) countedSteps += 1;

    if (expected == null) {
      // Unrecognized operation — adopt the declared count (if any) as the new
      // running count so later steps still check against something sensible.
      if (declared != null) running = declared;
      continue;
    }

    if (typeof expected === 'object') {
      // Range match (foundation-row case)
      if (declared != null) {
        checkedSteps += 1;
        if (declared < expected.min || declared > expected.max) {
          issues.push({ row, expected: `${expected.min}–${expected.max}`, declared, instruction: text });
        }
        running = declared;
      }
      continue;
    }

    if (declared != null) {
      checkedSteps += 1;
      if (declared !== expected) {
        issues.push({ row, expected, declared, instruction: text });
      }
    }
    running = expected;
  }

  // Earned, not given: enough of the counted steps must be independently
  // checkable, and every check must agree.
  const coverage = countedSteps > 0 ? checkedSteps / countedSteps : 0;
  const verified = issues.length === 0 && checkedSteps >= 3 && coverage >= 0.6;

  return { verified, checkedSteps, countedSteps, issues };
}

module.exports = { validatePattern, declaredCount, computeExpectedCount };
