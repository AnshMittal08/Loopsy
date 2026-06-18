// ---------------------------------------------------------------------------
// Even stitch distribution — the core arithmetic for shaping a round by an
// arbitrary amount. Given a round of `prev` stitches, produce a round of
// `prev + inc` (increases) or `prev - dec` (decreases) with the shaping spread
// as evenly as crochet allows, and emit a canonical, checkable instruction.
//
// This is what lets the revolution engine turn ANY profile curve into exact
// stitch counts: each round's target is computed from the circumference, and
// the delta from the previous round is distributed here.
// ---------------------------------------------------------------------------

const STITCH_NAMES = {
  sc: 'single crochet',
  hdc: 'half double crochet',
  dc: 'double crochet',
};
const name = (s) => STITCH_NAMES[s] || STITCH_NAMES.sc;
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// "n stitches" segments → readable bracket text for one uniform group.
function incSegment(units, plain, stitch) {
  const nm = name(stitch);
  if (units <= 0) return null;
  if (plain === 0) {
    return units === 1
      ? `2 ${nm} in the next stitch`
      : `2 ${nm} in each of the next ${units} stitches`;
  }
  const span = plain === 1 ? 'next stitch' : `next ${plain} stitches`;
  return units === 1
    ? `${cap(nm)} in ${span}, 2 ${nm} in the next stitch`
    : `[${cap(nm)} in ${span}, 2 ${nm} in next stitch] repeat ${units} times`;
}

function decSegment(units, plain, stitch) {
  const nm = name(stitch);
  if (units <= 0) return null;
  if (plain === 0) {
    return units === 1
      ? `${cap(nm)} 2 together`
      : `[${cap(nm)} 2 together] repeat ${units} times`;
  }
  const span = plain === 1 ? 'next stitch' : `next ${plain} stitches`;
  return units === 1
    ? `${cap(nm)} in ${span}, ${nm} 2 together`
    : `[${cap(nm)} in ${span}, ${nm} 2 together] repeat ${units} times`;
}

/**
 * Increase a round of `prev` stitches by `inc`, evenly. inc is clamped to
 * [0, prev] (a round can at most double). Returns { instruction, count }.
 */
function increaseRow(prev, inc, stitch = 'sc') {
  inc = Math.max(0, Math.min(prev, Math.round(inc)));
  if (inc === 0) return evenRow(prev, stitch);
  if (inc === prev) {
    return { instruction: `2 ${name(stitch)} in each stitch around. (${prev * 2} stitches)`, count: prev * 2, rounds: 1 };
  }
  // `inc` increase points; `prev - inc` plain stitches spread across them.
  const plains = prev - inc;
  const q = Math.floor(plains / inc);
  const r = plains % inc;            // r groups get one extra plain stitch
  const segA = incSegment(inc - r, q, stitch);
  const segB = r > 0 ? incSegment(r, q + 1, stitch) : null;
  const body = [segA, segB].filter(Boolean).join(', then ');
  const count = prev + inc;
  return { instruction: `${body}. (${count} stitches)`, count, rounds: 1 };
}

/**
 * Decrease a round of `prev` stitches by `dec`, evenly. dec is clamped to
 * [0, floor(prev/2)]. Returns { instruction, count }.
 */
function decreaseRow(prev, dec, stitch = 'sc') {
  dec = Math.max(0, Math.min(Math.floor(prev / 2), Math.round(dec)));
  if (dec === 0) return evenRow(prev, stitch);
  // `dec` decrease points consume 2 each; `prev - 2*dec` plain stitches spread.
  const plains = prev - 2 * dec;
  const q = Math.floor(plains / dec);
  const r = plains % dec;
  const segA = decSegment(dec - r, q, stitch);
  const segB = r > 0 ? decSegment(r, q + 1, stitch) : null;
  const body = [segA, segB].filter(Boolean).join(', then ');
  const count = prev - dec;
  return { instruction: `${body}. (${count} stitches)`, count, rounds: 1 };
}

function evenRow(prev, stitch = 'sc') {
  return { instruction: `${cap(name(stitch))} in each stitch around. (${prev} stitches)`, count: prev, rounds: 1 };
}

/** Shape a round from `prev` to `target` (any direction). */
function shapeRow(prev, target, stitch = 'sc') {
  if (target > prev) return increaseRow(prev, target - prev, stitch);
  if (target < prev) return decreaseRow(prev, prev - target, stitch);
  return evenRow(prev, stitch);
}

module.exports = { increaseRow, decreaseRow, evenRow, shapeRow, name, cap };
