// ---------------------------------------------------------------------------
// Shape generators — deterministic crochet geometry.
//
// Each generator turns real-world dimensions + a gauge into exact rounds/rows
// with computed stitch counts using the standard distribution math
// (6-stitch magic ring, +6 per increase round, evenly spaced decreases).
//
// Every generated row is rendered in the same canonical plain-English style
// used by the seeded templates, so the validator can parse both.
//
// Row shape: { label, instruction, count, rounds }
//   label   "Round 3" | "Rounds 6–10" | "Row 2" | "Finishing" | null
//   count   resulting stitch count after the row (null for notes/finishing)
//   rounds  how many physical rounds/rows the entry covers (ranges > 1)
// ---------------------------------------------------------------------------

const { rowHeightCm } = require('./gauge');

const STITCH_NAMES = {
  sc: 'single crochet',
  hdc: 'half double crochet',
  dc: 'double crochet',
};

function stitchName(stitch) {
  return STITCH_NAMES[stitch] || STITCH_NAMES.sc;
}

function roundToMultiple(value, multiple, minimum = multiple) {
  return Math.max(minimum, Math.round(value / multiple) * multiple);
}

function cap(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ─── Canonical round renderers ──────────────────────────────────────────────

function magicRingRow(count, stitch) {
  return {
    instruction: `Magic ring. ${count} ${stitchName(stitch)} into ring. Pull ring closed. (${count} stitches)`,
    count,
    rounds: 1,
  };
}

function incAllRow(prevCount, stitch) {
  const next = prevCount * 2;
  return {
    instruction: `2 ${stitchName(stitch)} in each stitch around. (${next} stitches)`,
    count: next,
    rounds: 1,
  };
}

function spacedIncRow(prevCount, reps, stitch) {
  // prevCount → prevCount + reps, increases evenly spaced
  const plain = prevCount / reps - 1;
  const next = prevCount + reps;
  const name = stitchName(stitch);
  const span = plain === 1 ? 'next stitch' : `next ${plain} stitches`;
  return {
    instruction: `[${cap(name)} in ${span}, 2 ${name} in next stitch] repeat ${reps} times. (${next} stitches)`,
    count: next,
    rounds: 1,
  };
}

function spacedDecRow(prevCount, reps, stitch) {
  // prevCount → prevCount - reps, decreases evenly spaced
  const plain = prevCount / reps - 2;
  const next = prevCount - reps;
  const name = stitchName(stitch);
  if (plain <= 0) {
    return {
      instruction: `[${cap(name)} 2 together] repeat ${reps} times. (${next} stitches)`,
      count: next,
      rounds: 1,
    };
  }
  const span = plain === 1 ? 'next stitch' : `next ${plain} stitches`;
  return {
    instruction: `[${cap(name)} in ${span}, ${name} 2 together] repeat ${reps} times. (${next} stitches)`,
    count: next,
    rounds: 1,
  };
}

function evenRow(count, stitch, rounds = 1) {
  const name = stitchName(stitch);
  if (rounds > 1) {
    return {
      instruction: `${cap(name)} in each stitch around. (${count} stitches each round)`,
      count,
      rounds,
    };
  }
  return {
    instruction: `${cap(name)} in each stitch around. (${count} stitches)`,
    count,
    rounds: 1,
  };
}

function noteRow(label, instruction) {
  return { label, instruction, count: null, rounds: 0 };
}

/** Assign "Round N" / "Rounds N–M" labels in sequence. */
function labelRounds(rows, unit = 'Round') {
  let at = 1;
  return rows.map((row) => {
    if (row.rounds === 0) return row; // notes keep their own label
    const label =
      row.rounds > 1 ? `${unit}s ${at}–${at + row.rounds - 1}` : `${unit} ${at}`;
    at += row.rounds;
    return { ...row, label };
  });
}

// ─── Generators ─────────────────────────────────────────────────────────────

/**
 * Shared body for closed round shapes (sphere, ellipsoid): increase rounds to
 * maxSts, the given number of even rounds, then mirrored decreases, stuffing
 * note, and a closed finish.
 */
function closedRoundRows(maxSts, evenRounds, stitch) {
  const k = maxSts / 6; // increase rounds, magic ring included
  const rows = [magicRingRow(6, stitch)];
  let count = 6;
  for (let i = 2; i <= k; i++) {
    rows.push(i === 2 ? incAllRow(count, stitch) : spacedIncRow(count, 6, stitch));
    count = rows[rows.length - 1].count;
  }
  rows.push(evenRow(count, stitch, evenRounds));
  while (count > 12) {
    rows.push(spacedDecRow(count, 6, stitch));
    count -= 6;
    if (count === 18) {
      rows.push(noteRow('Stuffing', 'Stuff firmly with polyfill, shaping as you go. Keep adding stuffing as the opening closes.'));
    }
  }
  if (count === 12) {
    rows.push(spacedDecRow(count, 6, stitch));
    count = 6;
  }
  rows.push(
    noteRow(
      'Finishing',
      'Fasten off leaving a long tail. Thread the tail through the front loops of the remaining 6 stitches, pull tight to close, and weave in the end.'
    )
  );

  return { rows, finalCount: count };
}

/**
 * Amigurumi sphere worked in continuous rounds.
 * Textbook math: 6 sc magic ring, +6 per round to the target circumference,
 * even rounds through the equator, −6 per round back down, stuff, close.
 */
function sphere({ diameterCm }, gauge, stitch = 'sc') {
  const circumference = Math.PI * diameterCm;
  const maxSts = roundToMultiple(circumference * gauge.stsPerCm, 6, 12);
  const k = maxSts / 6;
  const targetRounds = Math.round(diameterCm / rowHeightCm(gauge, stitch));
  const evenRounds = Math.max(1, targetRounds - (k + (k - 1)));

  const { rows, finalCount } = closedRoundRows(maxSts, evenRounds, stitch);

  return {
    shape: 'sphere',
    worked: 'rounds',
    rows: labelRounds(rows),
    maxStitchCount: maxSts,
    finalCount,
  };
}

/**
 * Prolate ellipsoid (egg / amigurumi body): the same closed-round math as a
 * sphere, but the run of even rounds is sized so the long axis reaches
 * heightCm. diameterCm is the widest cross-section.
 */
function ellipsoid({ diameterCm, heightCm }, gauge, stitch = 'sc') {
  const circumference = Math.PI * diameterCm;
  const maxSts = roundToMultiple(circumference * gauge.stsPerCm, 6, 12);
  const k = maxSts / 6;
  const targetRounds = Math.round(heightCm / rowHeightCm(gauge, stitch));
  const evenRounds = Math.max(1, targetRounds - (k + (k - 1)));

  const { rows, finalCount } = closedRoundRows(maxSts, evenRounds, stitch);

  return {
    shape: 'ellipsoid',
    worked: 'rounds',
    rows: labelRounds(rows),
    maxStitchCount: maxSts,
    finalCount,
  };
}

/**
 * Open hemisphere (bowl) — sphere increases, then straight rounds to the rim.
 */
function hemisphere({ diameterCm }, gauge, stitch = 'sc') {
  const circumference = Math.PI * diameterCm;
  const maxSts = roundToMultiple(circumference * gauge.stsPerCm, 6, 12);
  const k = maxSts / 6;
  const targetRounds = Math.round((diameterCm / 2) / rowHeightCm(gauge, stitch));
  const evenRounds = Math.max(1, targetRounds - k);

  const rows = [magicRingRow(6, stitch)];
  let count = 6;
  for (let i = 2; i <= k; i++) {
    rows.push(i === 2 ? incAllRow(count, stitch) : spacedIncRow(count, 6, stitch));
    count = rows[rows.length - 1].count;
  }
  rows.push(evenRow(count, stitch, evenRounds));
  rows.push(noteRow('Finishing', 'Fasten off leaving a long tail for sewing.'));

  return {
    shape: 'hemisphere',
    worked: 'rounds',
    rows: labelRounds(rows),
    maxStitchCount: maxSts,
    finalCount: count,
  };
}

/**
 * Tube / cylinder. Closed-bottom tubes start from a flat disc (magic ring +
 * increase rounds); open tubes start from a joined foundation chain.
 */
function tube({ diameterCm, circumferenceCm, heightCm, closedBottom = true }, gauge, stitch = 'sc') {
  const circumference = circumferenceCm ?? Math.PI * diameterCm;
  const sts = roundToMultiple(circumference * gauge.stsPerCm, 6, 12);
  const heightRounds = Math.max(1, Math.round(heightCm / rowHeightCm(gauge, stitch)));

  const rows = [];
  let count;

  if (closedBottom) {
    const k = sts / 6;
    rows.push(magicRingRow(6, stitch));
    count = 6;
    for (let i = 2; i <= k; i++) {
      rows.push(i === 2 ? incAllRow(count, stitch) : spacedIncRow(count, 6, stitch));
      count = rows[rows.length - 1].count;
    }
    const wall = evenRow(count, stitch, heightRounds);
    wall.instruction = `Working in back loops only for this round, then through both loops: ${wall.instruction.charAt(0).toLowerCase()}${wall.instruction.slice(1)}`;
    rows.push(wall);
  } else {
    count = sts;
    rows.push({
      instruction: `Chain ${sts}. Join with a slip stitch to the first chain to form a ring, being careful not to twist. ${cap(stitchName(stitch))} in each chain around. (${sts} stitches)`,
      count: sts,
      rounds: 1,
    });
    rows.push(evenRow(count, stitch, heightRounds));
  }

  rows.push(noteRow('Finishing', 'Fasten off and weave in ends.'));

  return {
    shape: 'tube',
    worked: 'rounds',
    rows: labelRounds(rows),
    maxStitchCount: sts,
    finalCount: count,
  };
}

/**
 * Cone from the tip down: increase rounds distributed evenly among straight
 * rounds so the slope reaches the base circumference at the target height.
 */
function cone({ baseDiameterCm, heightCm }, gauge, stitch = 'sc') {
  const baseSts = roundToMultiple(Math.PI * baseDiameterCm * gauge.stsPerCm, 6, 12);
  const k = baseSts / 6; // rounds that carry an increase (magic ring included)
  const totalRounds = Math.max(k, Math.round(heightCm / rowHeightCm(gauge, stitch)));

  // Spread the k-1 remaining increase rounds evenly across rounds 2..totalRounds.
  const incRoundIndexes = new Set();
  for (let i = 1; i < k; i++) {
    incRoundIndexes.add(2 + Math.round(((i - 1) * (totalRounds - 2)) / Math.max(1, k - 2)));
  }

  const rows = [magicRingRow(6, stitch)];
  let count = 6;
  let evenBuffer = 0;

  const flushEven = () => {
    if (evenBuffer > 0) {
      rows.push(evenRow(count, stitch, evenBuffer));
      evenBuffer = 0;
    }
  };

  for (let r = 2; r <= totalRounds; r++) {
    if (incRoundIndexes.has(r) && count < baseSts) {
      flushEven();
      rows.push(count === 6 ? incAllRow(count, stitch) : spacedIncRow(count, 6, stitch));
      count = rows[rows.length - 1].count;
    } else {
      evenBuffer += 1;
    }
  }
  // Guarantee the base circumference is reached even if rounding starved us.
  while (count < baseSts) {
    flushEven();
    rows.push(count === 6 ? incAllRow(count, stitch) : spacedIncRow(count, 6, stitch));
    count = rows[rows.length - 1].count;
  }
  flushEven();
  rows.push(noteRow('Finishing', 'Fasten off leaving a long tail for sewing.'));

  return {
    shape: 'cone',
    worked: 'rounds',
    rows: labelRounds(rows),
    maxStitchCount: baseSts,
    finalCount: count,
  };
}

/**
 * Flat rectangular panel worked back and forth in rows.
 */
function flatPanel({ widthCm, heightCm }, gauge, stitch = 'sc') {
  const sts = Math.max(2, Math.round(widthCm * gauge.stsPerCm));
  const totalRows = Math.max(1, Math.round(heightCm / rowHeightCm(gauge, stitch)));
  const name = stitchName(stitch);
  const turningChains = stitch === 'dc' ? 3 : stitch === 'hdc' ? 2 : 1;

  const rows = [];
  rows.push({
    label: 'Foundation',
    instruction: `Chain ${sts + turningChains}. (${sts + turningChains} chains)`,
    count: sts + turningChains,
    rounds: 0,
  });
  rows.push({
    instruction: `${cap(name)} in the ${turningChains + 1}${ordinalSuffix(turningChains + 1)} chain from the hook and in each chain across. (${sts} stitches) Chain ${turningChains}, turn.`,
    count: sts,
    rounds: 1,
  });
  if (totalRows > 1) {
    rows.push({
      instruction: `${cap(name)} in each stitch across. (${sts} stitches) Chain ${turningChains}, turn. Do not chain or turn at the end of the final row.`,
      count: sts,
      rounds: totalRows - 1,
    });
  }
  rows.push(noteRow('Finishing', 'Fasten off and weave in ends with a tapestry needle.'));

  // Label rows ("Row N"), skipping the foundation entry.
  let at = 1;
  const labeled = rows.map((row) => {
    if (row.rounds === 0) return row;
    const label = row.rounds > 1 ? `Rows ${at}–${at + row.rounds - 1}` : `Row ${at}`;
    at += row.rounds;
    return { ...row, label };
  });

  return {
    shape: 'flatPanel',
    worked: 'rows',
    rows: labeled,
    maxStitchCount: sts,
    finalCount: sts,
  };
}

function ordinalSuffix(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'st';
  if (n % 10 === 2 && n % 100 !== 12) return 'nd';
  if (n % 10 === 3 && n % 100 !== 13) return 'rd';
  return 'th';
}

// Head circumference (cm) and finished hat depth (cm) by size.
const HAT_SIZES = {
  baby: { headCm: 40, depthCm: 14 },
  toddler: { headCm: 48, depthCm: 16 },
  child: { headCm: 51, depthCm: 18 },
  teen: { headCm: 54, depthCm: 20 },
  'adult-s': { headCm: 55, depthCm: 20 },
  'adult-m': { headCm: 57, depthCm: 21 },
  'adult-l': { headCm: 59, depthCm: 22 },
};

/**
 * Classic top-down beanie crown in double crochet: flat disc until the
 * circumference matches the head (with ~10% negative ease), then straight
 * rounds to depth.
 */
function hatCrown({ size = 'adult-m' }, gauge, stitch = 'dc') {
  const sizing = HAT_SIZES[size] || HAT_SIZES['adult-m'];
  const targetSts = roundToMultiple(sizing.headCm * 0.9 * gauge.stsPerCm, 12, 24);
  const start = 12;
  const incRounds = targetSts / start; // 12 → 24 → 36 … +12 per round
  const height = rowHeightCm(gauge, stitch);
  // The disc contributes its radius to depth; remaining depth is straight rounds.
  const discDepth = incRounds * height;
  const evenRounds = Math.max(1, Math.round((sizing.depthCm - discDepth) / height));
  const name = stitchName(stitch);

  const rows = [];
  rows.push({
    instruction: `Magic ring. Chain 2 (does not count as a stitch), ${start} ${name} into ring. Join with a slip stitch to the first ${name}. (${start} stitches)`,
    count: start,
    rounds: 1,
  });
  let count = start;
  for (let i = 2; i <= incRounds; i++) {
    const row = i === 2 ? incAllRow(count, stitch) : spacedIncRow(count, 12, stitch);
    row.instruction = `Chain 2 (does not count as a stitch), ${row.instruction.charAt(0).toLowerCase()}${row.instruction.slice(1)} Join with a slip stitch.`;
    rows.push(row);
    count = row.count;
  }
  const body = evenRow(count, stitch, evenRounds);
  body.instruction = `Chain 2 (does not count as a stitch), ${body.instruction.charAt(0).toLowerCase()}${body.instruction.slice(1)} Join with a slip stitch at the end of each round.`;
  rows.push(body);
  rows.push(
    noteRow(
      'Brim',
      `Work 2 rounds of single crochet in each stitch around for a clean edge. (${count} stitches each round) Fasten off and weave in ends.`
    )
  );

  return {
    shape: 'hatCrown',
    worked: 'rounds',
    rows: labelRounds(rows),
    maxStitchCount: count,
    finalCount: count,
    meta: { size, ...sizing },
  };
}

/**
 * Classic granny square: 3-dc clusters with chain-2 corners.
 * Each round adds 12 double crochet (one cluster per side).
 */
function grannySquare({ sideCm, rounds: roundsWanted }, gauge) {
  // One granny round adds roughly two dc row-heights to the side length.
  const roundCount =
    roundsWanted || Math.max(2, Math.round(sideCm / (2 * rowHeightCm(gauge, 'dc'))));

  const rows = [];
  rows.push({
    instruction:
      'Magic ring. Chain 3 (counts as first double crochet), 2 double crochet into ring, chain 2, [3 double crochet into ring, chain 2] repeat 3 times. Join with a slip stitch to the top of the chain 3. (12 stitches)',
    count: 12,
    rounds: 1,
  });
  let count = 12;
  for (let r = 2; r <= roundCount; r++) {
    count += 12;
    rows.push({
      instruction: `Slip stitch to the next corner space. Chain 3, work [2 double crochet, chain 2, 3 double crochet] in the corner space, then 3 double crochet in each side space and [3 double crochet, chain 2, 3 double crochet] in each remaining corner space around. Join with a slip stitch. (${count} stitches)`,
      count,
      rounds: 1,
    });
  }
  rows.push(noteRow('Finishing', 'Fasten off and weave in ends.'));

  return {
    shape: 'grannySquare',
    worked: 'rounds',
    rows: labelRounds(rows),
    maxStitchCount: count,
    finalCount: count,
  };
}

// ─── E1 expansion: flat motifs + tapered forms ──────────────────────────────

/**
 * Flat circle (coaster / appliqué base / rug): a disc worked in the round that
 * stays flat — +6 evenly-spaced increases every round, one round per row-height
 * of radius. Fully validator-checkable (canonical increase idioms only).
 */
function flatCircle({ diameterCm }, gauge, stitch = 'sc') {
  const rounds = Math.max(2, Math.round((diameterCm / 2) / rowHeightCm(gauge, stitch)));
  const rows = [magicRingRow(6, stitch)];
  let count = 6;
  for (let r = 2; r <= rounds; r++) {
    rows.push(r === 2 ? incAllRow(count, stitch) : spacedIncRow(count, 6, stitch));
    count = rows[rows.length - 1].count;
  }
  rows.push(noteRow('Finishing', 'Slip stitch to the next stitch for a smooth edge. Fasten off and weave in ends. Block flat if the disc cups.'));
  return { shape: 'flatCircle', worked: 'rounds', rows: labelRounds(rows), maxStitchCount: count, finalCount: count };
}

/**
 * Flat hexagon: identical stitch math to the flat circle (+6 per round), but
 * the increases are STACKED at the same six points every round so corners form.
 */
function flatHexagon({ diameterCm }, gauge, stitch = 'sc') {
  const base = flatCircle({ diameterCm }, gauge, stitch);
  const rows = [
    noteRow('Technique', 'Work exactly as written, but place each round\'s increases directly on top of the previous round\'s increases — stacking them at the same six points turns the disc into a hexagon with crisp corners.'),
    ...base.rows,
  ];
  return { ...base, shape: 'flatHexagon', rows };
}

/**
 * Tapered tube (frustum): a limb/horn/planter that starts at one diameter and
 * ends at another. Disc base (when closed), then the +/-6 shaping rounds are
 * distributed evenly across the height. Canonical idioms — fully checkable.
 */
function taperedTube({ bottomDiameterCm, topDiameterCm, heightCm, closedBottom = true }, gauge, stitch = 'sc') {
  const bottomSts = roundToMultiple(Math.PI * bottomDiameterCm * gauge.stsPerCm, 6, 12);
  const topSts = roundToMultiple(Math.PI * topDiameterCm * gauge.stsPerCm, 6, 6);
  const heightRounds = Math.max(1, Math.round(heightCm / rowHeightCm(gauge, stitch)));

  const rows = [];
  let count;
  if (closedBottom) {
    rows.push(magicRingRow(6, stitch));
    count = 6;
    for (let i = 2; i <= bottomSts / 6; i++) {
      rows.push(i === 2 ? incAllRow(count, stitch) : spacedIncRow(count, 6, stitch));
      count = rows[rows.length - 1].count;
    }
  } else {
    count = bottomSts;
    rows.push({
      instruction: `Chain ${bottomSts}. Join with a slip stitch to the first chain to form a ring, being careful not to twist. ${cap(stitchName(stitch))} in each chain around. (${bottomSts} stitches)`,
      count: bottomSts,
      rounds: 1,
    });
  }

  // Distribute the shaping rounds (±6 sts each) evenly across the wall height.
  const shapingSteps = Math.abs(topSts - count) / 6;
  const dir = topSts > count ? 1 : -1;
  const shapeAt = new Set();
  for (let i = 1; i <= shapingSteps; i++) {
    shapeAt.add(Math.max(1, Math.round((i * heightRounds) / (shapingSteps + 1))));
  }
  let evenBuffer = 0;
  const flushEven = () => {
    if (evenBuffer > 0) { rows.push(evenRow(count, stitch, evenBuffer)); evenBuffer = 0; }
  };
  for (let r = 1; r <= heightRounds; r++) {
    if (shapeAt.has(r) && count !== topSts) {
      flushEven();
      rows.push(dir > 0 ? spacedIncRow(count, 6, stitch) : spacedDecRow(count, 6, stitch));
      count = rows[rows.length - 1].count;
    } else {
      evenBuffer += 1;
    }
  }
  while (count !== topSts) { // guarantee the top circumference even if rounding starved us
    flushEven();
    rows.push(dir > 0 ? spacedIncRow(count, 6, stitch) : spacedDecRow(count, 6, stitch));
    count = rows[rows.length - 1].count;
  }
  flushEven();
  rows.push(noteRow('Finishing', 'Fasten off leaving a long tail for sewing.'));

  return { shape: 'taperedTube', worked: 'rounds', rows: labelRounds(rows), maxStitchCount: Math.max(bottomSts, topSts), finalCount: count };
}

/**
 * Flat triangle worked in rows from the base up: one edge decrease per row
 * until a single stitch remains at the apex. Counts are declared every row;
 * edge decreases aren't the bracketed idiom, so the validator skips (never
 * mis-flags) those rows — the shape ships honest but only partially checkable.
 */
function triangle({ baseCm }, gauge, stitch = 'sc') {
  const sts = Math.max(3, Math.round(baseCm * gauge.stsPerCm));
  const name = stitchName(stitch);
  const rows = [];
  rows.push({ label: 'Foundation', instruction: `Chain ${sts + 1}. (${sts + 1} chains)`, count: sts + 1, rounds: 0 });
  rows.push({
    instruction: `${cap(name)} in the 2nd chain from the hook and in each chain across. (${sts} stitches) Chain 1, turn.`,
    count: sts,
    rounds: 1,
  });
  for (let c = sts - 1; c >= 1; c--) {
    rows.push({
      instruction: c > 1
        ? `${cap(name)} 2 together, then ${name} in each stitch across. (${c} stitches) Chain 1, turn.`
        : `${cap(name)} 2 together — 1 stitch remains at the apex. (1 stitch)`,
      count: c,
      rounds: 1,
    });
  }
  rows.push(noteRow('Finishing', 'Fasten off and weave in ends. For a crisper edge, work one round of single crochet around all three sides.'));

  let at = 1;
  const labeled = rows.map((row) => {
    if (row.rounds === 0) return row;
    const label = `Row ${at}`;
    at += row.rounds;
    return { ...row, label };
  });
  return { shape: 'triangle', worked: 'rows', rows: labeled, maxStitchCount: sts, finalCount: 1 };
}

/**
 * Five-point star: a checkable flat-circle centre, then the five points worked
 * back and forth over equal segments of the final round. Point rows use edge
 * decreases (skipped, never mis-flagged, by the validator).
 */
function star({ sizeCm }, gauge, stitch = 'sc') {
  const big = sizeCm >= 8;
  const rows = [magicRingRow(10, stitch)];
  let count = 10;
  rows.push(incAllRow(count, stitch)); // 20
  count = 20;
  if (big) {
    rows.push(spacedIncRow(count, 10, stitch)); // 30
    count = 30;
  }
  const per = count / 5;
  rows.push(
    noteRow(
      'Points',
      `Make 5 points: working over the next ${per} stitches only, turn and work back and forth — ${stitchName(stitch)} across, working the first 2 stitches together on every row, until 1 stitch remains. Fasten off that point, rejoin yarn in the next unworked stitch of the centre round, and repeat for the remaining points.`
    )
  );
  rows.push(noteRow('Finishing', 'Weave in all ends, then block the star flat so the points lie sharp.'));
  return { shape: 'star', worked: 'rounds', rows: labelRounds(rows), maxStitchCount: count, finalCount: count };
}

/**
 * Flat heart worked in rows from the bottom point up: +2 per row (one increase
 * at each edge) to full width, a straight body, then two separately-worked
 * lobes. Edge increases aren't the bracketed idiom → validator skips those
 * rows; the counts are still declared honestly on every row.
 */
function heart({ widthCm }, gauge, stitch = 'sc') {
  const target = Math.max(6, roundToMultiple(Math.round(widthCm * gauge.stsPerCm), 2));
  const name = stitchName(stitch);
  const rows = [];
  rows.push({
    label: 'Row 1',
    instruction: `Chain 2. Work 2 ${name} in the 2nd chain from the hook. (2 stitches) Chain 1, turn.`,
    count: 2,
    rounds: 1,
  });
  let count = 2;
  let at = 2;
  while (count < target) {
    count += 2;
    rows.push({
      label: `Row ${at}`,
      instruction: `2 ${name} in the first stitch, ${name} in each stitch across to the last stitch, 2 ${name} in the last stitch. (${count} stitches) Chain 1, turn.`,
      count,
      rounds: 1,
    });
    at += 1;
  }
  const bodyRows = Math.max(1, Math.round(count / 4));
  rows.push({
    label: bodyRows > 1 ? `Rows ${at}–${at + bodyRows - 1}` : `Row ${at}`,
    instruction: `${cap(name)} in each stitch across. (${count} stitches) Chain 1, turn.`,
    count,
    rounds: bodyRows,
  });
  const lobe = count / 2;
  rows.push(
    noteRow(
      'Lobes',
      `First lobe: working over the first ${lobe} stitches only, work 2 rows of ${name}, working the 2 edge stitches together on each row, then fasten off. Second lobe: rejoin yarn in the next unworked stitch and repeat. This rounds the two bumps of the heart.`
    )
  );
  rows.push(noteRow('Finishing', 'Work one round of single crochet around the whole edge to smooth the silhouette, easing around the point and the dip between lobes. Fasten off and weave in ends.'));
  return { shape: 'heart', worked: 'rows', rows, maxStitchCount: count, finalCount: count };
}

// ─── E2 expansion: split-limb body (legs-first continuous amigurumi) ────────

/**
 * The classic "legs-first" amigurumi construction, worked as ONE piece:
 * two identical limbs (the first fastened off, the second kept live), a
 * joining round that chains between them, then a body worked upward over the
 * combined stitches and decreased closed — no sewing legs on.
 *
 * The joining round is not a canonical increase/decrease idiom, so the
 * validator adopts its declared count (skipped, never mis-flagged); every
 * other round is canonical and fully checkable.
 */
function splitLimbBody({ limbDiameterCm, limbHeightCm, bodyDiameterCm, bodyHeightCm }, gauge, stitch = 'sc') {
  const limbSts = roundToMultiple(Math.PI * limbDiameterCm * gauge.stsPerCm, 6, 6);
  const limbRounds = Math.max(1, Math.round(limbHeightCm / rowHeightCm(gauge, stitch)));

  // Body circumference must exceed both legs joined; the bridge chains make up
  // the difference (half on each side), so it must differ by a multiple of 6.
  let bodySts = roundToMultiple(Math.PI * bodyDiameterCm * gauge.stsPerCm, 6, 12);
  if (bodySts < 2 * limbSts + 6) bodySts = 2 * limbSts + 6;
  const bridge = (bodySts - 2 * limbSts) / 2;

  const bodyRounds = Math.max(1, Math.round(bodyHeightCm / rowHeightCm(gauge, stitch)));
  const name = stitchName(stitch);

  // One limb: disc base to limbSts, then straight rounds.
  const limbRows = () => {
    const rows = [magicRingRow(6, stitch)];
    let c = 6;
    for (let i = 2; i <= limbSts / 6; i++) {
      rows.push(i === 2 ? incAllRow(c, stitch) : spacedIncRow(c, 6, stitch));
      c = rows[rows.length - 1].count;
    }
    const wallRounds = Math.max(1, limbRounds - (limbSts / 6 - 1));
    rows.push(evenRow(c, stitch, wallRounds));
    return rows;
  };

  const rows = [];
  rows.push(noteRow('Limb 1', 'First limb — worked in continuous rounds:'));
  for (const r of labelRounds(limbRows())) rows.push(r);
  rows.push(noteRow(null, 'Fasten off the first limb and set it aside, leaving the stuffing opening at the top.'));

  rows.push(noteRow('Limb 2', 'Second limb — work exactly as the first, but do NOT fasten off; the body continues from here:'));
  for (const r of labelRounds(limbRows())) rows.push(r);

  rows.push(noteRow(null, 'Stuff both limbs firmly before joining.'));
  rows.push({
    label: 'Joining round',
    instruction:
      `Chain ${bridge}. ${cap(name)} in each of the ${limbSts} stitches of the first limb, ` +
      `${name} in each of the ${bridge} chains, ${name} in each of the ${limbSts} stitches of the second limb, ` +
      `then ${name} in each of the ${bridge} chains on the other side. The limbs are now joined into one body. (${bodySts} stitches)`,
    count: bodySts,
    rounds: 1,
  });

  const bodyRows = [];
  bodyRows.push(evenRow(bodySts, stitch, bodyRounds));
  let count = bodySts;
  while (count > 12) {
    bodyRows.push(spacedDecRow(count, 6, stitch));
    count -= 6;
    if (count === 18) {
      bodyRows.push(noteRow('Stuffing', 'Stuff the body firmly with polyfill, shaping as you go. Keep adding stuffing as the opening closes.'));
    }
  }
  if (count === 12) {
    bodyRows.push(spacedDecRow(count, 6, stitch));
    count = 6;
  }
  // Continue the round numbering from the joining round.
  let at = 2;
  for (const row of bodyRows) {
    if (row.rounds === 0) { rows.push(row); continue; }
    const label = row.rounds > 1 ? `Body rounds ${at}–${at + row.rounds - 1}` : `Body round ${at}`;
    rows.push({ ...row, label });
    at += row.rounds;
  }
  rows.push(
    noteRow(
      'Finishing',
      'Fasten off leaving a long tail. Thread the tail through the front loops of the remaining 6 stitches, pull tight to close, and weave in the end.'
    )
  );

  return {
    shape: 'splitLimbBody',
    worked: 'rounds',
    rows,
    maxStitchCount: bodySts,
    finalCount: count,
    meta: { limbSts, bodySts, bridge },
  };
}

const { revolve } = require('./revolve');
const { raglanSweater, sock, mitten } = require('./garments');

const SHAPE_GENERATORS = {
  sphere,
  ellipsoid,
  hemisphere,
  tube,
  cone,
  flatPanel,
  hatCrown,
  grannySquare,
  revolve,
  flatCircle,
  flatHexagon,
  taperedTube,
  triangle,
  star,
  heart,
  splitLimbBody,
  raglanSweater,
  sock,
  mitten,
};

module.exports = {
  SHAPE_GENERATORS,
  HAT_SIZES,
  sphere,
  ellipsoid,
  hemisphere,
  tube,
  cone,
  flatPanel,
  hatCrown,
  grannySquare,
  revolve,
  flatCircle,
  flatHexagon,
  taperedTube,
  triangle,
  star,
  heart,
  splitLimbBody,
  raglanSweater,
  sock,
  mitten,
};
