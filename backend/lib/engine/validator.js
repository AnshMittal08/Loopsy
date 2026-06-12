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

/**
 * Given the instruction text and the previous running count, compute the
 * expected count. Returns null when the operation isn't recognized.
 */
function computeExpectedCount(text, prev) {
  const t = text.toLowerCase();

  // Cluster/corner rounds (granny squares, shells) are not modelled — skip
  // rather than guess. The declared count is adopted as the running count.
  if (/corner/.test(t) || (/\[/.test(t) && /into ring/.test(t))) return null;

  // Joined double-crochet rounds where "chain 3 counts as a stitch" use a
  // convention with prelude stitches the parser cannot reliably model.
  if (/slip stitch/.test(t) && /chain\s*3/.test(t)) return null;

  // Magic ring start: "Magic ring. 6 single crochet into ring."
  let m = t.match(new RegExp(`magic ring[^.]*?(\\d+)\\s+${STITCH_WORDS}\\s+into(?:\\s+the)?\\s+ring`));
  if (m) return parseInt(m[1], 10);
  m = t.match(new RegExp(`(\\d+)\\s+${STITCH_WORDS}\\s+(?:into|in)(?:\\s+the)?\\s+(?:magic\\s+)?ring`));
  if (m) return parseInt(m[1], 10);

  // "2 single crochet in each stitch around" → double
  if (new RegExp(`2\\s+${STITCH_WORDS}\\s+in\\s+each\\s+stitch\\s+around`).test(t)) {
    return prev != null ? prev * 2 : null;
  }

  // "[Single crochet in next N stitch(es), 2 single crochet in next stitch] repeat M times"
  m = t.match(
    new RegExp(
      `\\[${STITCH_WORDS}\\s+in\\s+(?:the\\s+)?next(?:\\s+(\\d+))?\\s+stitch(?:es)?,\\s*2\\s+${STITCH_WORDS}\\s+in\\s+(?:the\\s+)?next\\s+stitch\\]\\s*repeat\\s+(\\d+)\\s+times`
    )
  );
  if (m) {
    const plain = m[1] ? parseInt(m[1], 10) : 1;
    const reps = parseInt(m[2], 10);
    return reps * (plain + 2);
  }

  // "[Single crochet in next N stitch(es), single crochet 2 together] repeat M times"
  m = t.match(
    new RegExp(
      `\\[${STITCH_WORDS}\\s+in\\s+(?:the\\s+)?next(?:\\s+(\\d+))?\\s+stitch(?:es)?,\\s*(?:${STITCH_WORDS}\\s+)?(?:2\\s+together|decrease)\\]\\s*repeat\\s+(\\d+)\\s+times`
    )
  );
  if (m) {
    const plain = m[1] ? parseInt(m[1], 10) : 1;
    const reps = parseInt(m[2], 10);
    return reps * (plain + 1);
  }

  // "[Single crochet 2 together] repeat M times"
  m = t.match(new RegExp(`\\[(?:${STITCH_WORDS}\\s+)?(?:2\\s+together|decrease)\\]\\s*repeat\\s+(\\d+)\\s+times`));
  if (m) return parseInt(m[1], 10);

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
