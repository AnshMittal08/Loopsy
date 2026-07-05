// ---------------------------------------------------------------------------
// Garments (E3) — raglan sweater, sock, mitten with real sizing tables.
//
// Constructions are chosen so nearly every round is a canonical idiom the
// validator can re-derive:
//   - raglan yoke rounds use the bracketed raglan idiom (+8/round, derived)
//   - thumb/heel openings use the count-neutral "chain N, skip N" idiom
//   - cuffs are back-loop-only even rounds (derived by the even-round rule)
//   - the sweater's divide round (body/sleeves split) declares its count and
//     is adopted, not guessed — the one honest seam in the math
// ---------------------------------------------------------------------------

const { rowHeightCm } = require('./gauge');

const STITCH_NAMES = { sc: 'single crochet', hdc: 'half double crochet', dc: 'double crochet' };
const stitchName = (s) => STITCH_NAMES[s] || STITCH_NAMES.sc;
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

function roundToMultiple(value, multiple, minimum = multiple) {
  return Math.max(minimum, Math.round(value / multiple) * multiple);
}

function evenRow(count, stitch, rounds = 1) {
  const name = stitchName(stitch);
  return {
    instruction: rounds > 1
      ? `${cap(name)} in each stitch around. (${count} stitches each round)`
      : `${cap(name)} in each stitch around. (${count} stitches)`,
    count,
    rounds,
  };
}

function ribRow(count, stitch, rounds) {
  const base = evenRow(count, stitch, rounds);
  return { ...base, instruction: `Working in back loops only, ${base.instruction.charAt(0).toLowerCase()}${base.instruction.slice(1)}` };
}

function joinChainRow(sts, stitch) {
  return {
    instruction: `Chain ${sts}. Join with a slip stitch to the first chain to form a ring, being careful not to twist. ${cap(stitchName(stitch))} in each chain around. (${sts} stitches)`,
    count: sts,
    rounds: 1,
  };
}

function spacedDecRow(prevCount, reps, stitch) {
  const plain = prevCount / reps - 2;
  const next = prevCount - reps;
  const name = stitchName(stitch);
  if (plain <= 0) {
    return { instruction: `[${cap(name)} 2 together] repeat ${reps} times. (${next} stitches)`, count: next, rounds: 1 };
  }
  const span = plain === 1 ? 'next stitch' : `next ${plain} stitches`;
  return { instruction: `[${cap(name)} in ${span}, ${name} 2 together] repeat ${reps} times. (${next} stitches)`, count: next, rounds: 1 };
}

function noteRow(label, instruction) {
  return { label, instruction, count: null, rounds: 0 };
}

function labelRounds(rows, unit = 'Round', startAt = 1) {
  let at = startAt;
  return rows.map((row) => {
    if (row.rounds === 0) return row;
    const label = row.rounds > 1 ? `${unit}s ${at}–${at + row.rounds - 1}` : `${unit} ${at}`;
    at += row.rounds;
    return { ...row, label };
  });
}

// Raglan increase round: 4 corners, each corner "2 sc in each of the next 2
// stitches" → +8. The validator derives this bracketed idiom exactly.
function raglanIncRow(prevCount, stitch) {
  const plain = prevCount / 4 - 2;
  const next = prevCount + 8;
  const name = stitchName(stitch);
  const span = plain === 1 ? 'next stitch' : `next ${plain} stitches`;
  return {
    instruction: `[${cap(name)} in ${span}, 2 ${name} in each of the next 2 stitches] repeat 4 times — the doubled stitches trace the four raglan lines. (${next} stitches)`,
    count: next,
    rounds: 1,
  };
}

// Count-neutral opening: chain over skipped stitches (peasant thumb / afterthought heel).
function openingRow(count, openSts, stitch, what) {
  const name = stitchName(stitch);
  return {
    instruction: `Chain ${openSts}, skip the next ${openSts} stitches (this gap becomes the ${what}), then ${name} in each remaining stitch around. Work into the chains on the next round. (${count} stitches)`,
    count,
    rounds: 1,
  };
}

// ─── Sizing tables ──────────────────────────────────────────────────────────

const SWEATER_SIZES = {
  baby:      { chestCm: 50, neckCm: 28, bodyCm: 16, sleeveCm: 15 },
  child:     { chestCm: 66, neckCm: 33, bodyCm: 24, sleeveCm: 26 },
  'adult-s': { chestCm: 90, neckCm: 40, bodyCm: 36, sleeveCm: 42 },
  'adult-m': { chestCm: 100, neckCm: 42, bodyCm: 38, sleeveCm: 45 },
  'adult-l': { chestCm: 110, neckCm: 44, bodyCm: 40, sleeveCm: 47 },
  'adult-xl': { chestCm: 120, neckCm: 46, bodyCm: 42, sleeveCm: 48 },
};

const SOCK_SIZES = {
  child:     { footCircCm: 16, footLenCm: 17, legCm: 8 },
  'adult-s': { footCircCm: 19, footLenCm: 22, legCm: 12 },
  'adult-m': { footCircCm: 21, footLenCm: 24, legCm: 14 },
  'adult-l': { footCircCm: 23, footLenCm: 27, legCm: 15 },
};

const MITTEN_SIZES = {
  child:     { handCircCm: 15, handLenCm: 13, cuffCm: 4, thumbSts: 8 },
  'adult-s': { handCircCm: 18, handLenCm: 17, cuffCm: 5, thumbSts: 10 },
  'adult-m': { handCircCm: 20, handLenCm: 19, cuffCm: 5, thumbSts: 10 },
  'adult-l': { handCircCm: 22, handLenCm: 20, cuffCm: 6, thumbSts: 12 },
};

// ─── Generators ─────────────────────────────────────────────────────────────

/**
 * Top-down raglan sweater worked in joined rounds: neck ring, raglan yoke
 * (+8 every other round, derived by the validator), a declared divide round
 * (body continues, sleeve stitches held with underarm chains), straight body
 * with a ribbed hem, then each sleeve picked up and worked down to a ribbed
 * cuff.
 */
function raglanSweater({ size = 'adult-m' }, gauge, stitch = 'sc') {
  const sz = SWEATER_SIZES[size] || SWEATER_SIZES['adult-m'];
  const h = rowHeightCm(gauge, stitch);
  const name = stitchName(stitch);

  // All key counts are multiples of 4 so raglan quarters stay whole.
  const neckSts = roundToMultiple(sz.neckCm * gauge.stsPerCm, 4, 24);
  const chestSts = roundToMultiple(sz.chestCm * gauge.stsPerCm, 4, neckSts + 16);

  // Yoke: +8 per increase round until front+back+underarms ≈ chest.
  // Divide: sleeves each take a quarter + raglan corners; underarm chains add ease.
  const underarm = 4;
  const incRounds = Math.max(3, Math.ceil((chestSts - 2 * underarm - neckSts) / 2 / 8));
  const yokeSts = neckSts + 8 * incRounds;
  const quarter = yokeSts / 4; // not necessarily whole per panel, so derive panels:
  const sleeveHeld = Math.round(quarter * 0.9 / 2) * 2; // even count per sleeve
  const bodySts = yokeSts - 2 * sleeveHeld + 2 * underarm;
  const sleeveSts = sleeveHeld + underarm;

  const bodyRounds = Math.max(4, Math.round(sz.bodyCm / h));
  const sleeveRounds = Math.max(4, Math.round(sz.sleeveCm / h));
  const ribRounds = 3;

  const yoke = [joinChainRow(neckSts, stitch)];
  let count = neckSts;
  for (let i = 0; i < incRounds; i++) {
    yoke.push(raglanIncRow(count, stitch));
    count += 8;
    if (i < incRounds - 1) yoke.push(evenRow(count, stitch, 1));
  }

  const rows = [];
  rows.push(noteRow('Yoke', 'Worked top-down in joined rounds from the neck. Place 4 stitch markers evenly to track the raglan lines.'));
  for (const r of labelRounds(yoke)) rows.push(r);

  rows.push({
    label: 'Divide round',
    instruction:
      `Divide for body and sleeves: ${name} in the next ${(bodySts - 2 * underarm) / 2} stitches (front), ` +
      `chain ${underarm} and skip the next ${sleeveHeld} stitches (first sleeve, on hold), ` +
      `${name} in the next ${(bodySts - 2 * underarm) / 2} stitches (back), ` +
      `chain ${underarm} and skip the next ${sleeveHeld} stitches (second sleeve, on hold). ` +
      `The body is now joined in one round. (${bodySts} stitches)`,
    count: bodySts,
    rounds: 1,
  });

  const body = [evenRow(bodySts, stitch, bodyRounds), ribRow(bodySts, stitch, ribRounds)];
  for (const r of labelRounds(body, 'Body round')) rows.push(r);
  rows.push(noteRow(null, 'Fasten off the body and weave in the end.'));

  rows.push(noteRow('Sleeves', `Make 2: rejoin yarn at the centre of an underarm; work the ${sleeveHeld} held sleeve stitches plus ${underarm} stitches from the underarm chain in continuous rounds.`));
  const sleeve = [];
  sleeve.push({
    instruction: `${cap(name)} in each of the ${sleeveHeld} held stitches, then ${name} in each of the ${underarm} underarm stitches. (${sleeveSts} stitches)`,
    count: sleeveSts,
    rounds: 1,
  });
  sleeve.push(evenRow(sleeveSts, stitch, Math.max(1, sleeveRounds - ribRounds - 1)));
  sleeve.push(ribRow(sleeveSts, stitch, ribRounds));
  for (const r of labelRounds(sleeve, 'Sleeve round')) rows.push(r);
  rows.push(noteRow('Finishing', 'Fasten off. Repeat for the second sleeve. Weave in all ends and block to measurements.'));

  return {
    shape: 'raglanSweater',
    worked: 'rounds',
    rows,
    maxStitchCount: Math.max(yokeSts, bodySts),
    finalCount: sleeveSts,
    meta: { size, ...sz, neckSts, yokeSts, bodySts, sleeveSts, sleeveHeld, underarm },
  };
}

/**
 * Toe-up sock in continuous rounds: sphere-style toe increases, straight
 * foot, a count-neutral chain-over heel opening (afterthought heel worked
 * like a second toe), straight leg, ribbed cuff.
 */
function sock({ size = 'adult-m' }, gauge, stitch = 'sc') {
  const sz = SOCK_SIZES[size] || SOCK_SIZES['adult-m'];
  const h = rowHeightCm(gauge, stitch);

  const footSts = roundToMultiple(sz.footCircCm * gauge.stsPerCm * 0.95, 6, 12); // slight negative ease
  const half = footSts / 2;
  const toeRounds = footSts / 6;
  const footLenRounds = Math.max(2, Math.round(sz.footLenCm / h) - toeRounds - 1);
  const legRounds = Math.max(2, Math.round(sz.legCm / h));
  const ribRounds = 3;

  const rows = [];
  const toe = [];
  toe.push({ instruction: `Magic ring. 6 ${stitchName(stitch)} into ring. Pull ring closed. (6 stitches)`, count: 6, rounds: 1 });
  let count = 6;
  for (let i = 2; i <= toeRounds; i++) {
    if (i === 2) {
      toe.push({ instruction: `2 ${stitchName(stitch)} in each stitch around. (12 stitches)`, count: 12, rounds: 1 });
      count = 12;
    } else {
      const plain = count / 6 - 1;
      const span = plain === 1 ? 'next stitch' : `next ${plain} stitches`;
      toe.push({ instruction: `[${cap(stitchName(stitch))} in ${span}, 2 ${stitchName(stitch)} in next stitch] repeat 6 times. (${count + 6} stitches)`, count: count + 6, rounds: 1 });
      count += 6;
    }
  }
  toe.push(evenRow(count, stitch, footLenRounds));
  toe.push(openingRow(count, half, stitch, 'heel opening'));
  toe.push(evenRow(count, stitch, legRounds));
  toe.push(ribRow(count, stitch, ribRounds));

  rows.push(noteRow('Sock', 'Worked toe-up in continuous rounds. Make 2.'));
  for (const r of labelRounds(toe)) rows.push(r);
  rows.push(noteRow(null, 'Fasten off the cuff and weave in the end.'));

  // Afterthought heel: worked like a second toe over the opening.
  const heel = [];
  heel.push({
    instruction: `Heel: rejoin yarn at the heel opening and work ${stitchName(stitch)} evenly into it — ${half} stitches from the skipped edge and ${half} from the chain edge. (${footSts} stitches)`,
    count: footSts,
    rounds: 1,
  });
  let hc = footSts;
  while (hc > 12) { heel.push(spacedDecRow(hc, 6, stitch)); hc -= 6; }
  heel.push(spacedDecRow(hc, 6, stitch)); hc = 6;
  for (const r of labelRounds(heel, 'Heel round')) rows.push(r);
  rows.push(noteRow('Finishing', 'Fasten off leaving a tail; thread it through the remaining 6 stitches, pull tight to close the heel, and weave in all ends.'));

  return {
    shape: 'sock',
    worked: 'rounds',
    rows,
    maxStitchCount: footSts,
    finalCount: hc,
    meta: { size, ...sz, footSts },
  };
}

/**
 * Mitten in continuous rounds: ribbed cuff, straight hand with a
 * count-neutral chain-over thumb opening (peasant thumb), sphere-style top
 * decreases, then the thumb worked from the opening.
 */
function mitten({ size = 'adult-m' }, gauge, stitch = 'sc') {
  const sz = MITTEN_SIZES[size] || MITTEN_SIZES['adult-m'];
  const h = rowHeightCm(gauge, stitch);

  const handSts = roundToMultiple(sz.handCircCm * gauge.stsPerCm * 0.95, 6, 12);
  const thumbOpen = Math.min(handSts / 2 - 2, Math.max(4, Math.round(sz.thumbSts / 2)));
  const cuffRounds = Math.max(2, Math.round(sz.cuffCm / h));
  const decRounds = (handSts - 6) / 6;
  const handRounds = Math.max(3, Math.round(sz.handLenCm / h) - decRounds);
  const belowThumb = Math.max(1, Math.round(handRounds * 0.35));
  const aboveThumb = Math.max(1, handRounds - belowThumb - 1);

  const rows = [];
  const body = [];
  body.push(joinChainRow(handSts, stitch));
  body.push(ribRow(handSts, stitch, cuffRounds));
  body.push(evenRow(handSts, stitch, belowThumb));
  body.push(openingRow(handSts, thumbOpen, stitch, 'thumb opening'));
  body.push(evenRow(handSts, stitch, aboveThumb));
  let count = handSts;
  while (count > 12) { body.push(spacedDecRow(count, 6, stitch)); count -= 6; }
  body.push(spacedDecRow(count, 6, stitch)); count = 6;

  rows.push(noteRow('Mitten', 'Worked cuff-up in continuous rounds. Make 2 (they are identical until you wear them).'));
  for (const r of labelRounds(body)) rows.push(r);
  rows.push(noteRow(null, 'Fasten off leaving a tail; thread it through the remaining 6 stitches and pull tight to close the top.'));

  const thumbSts = thumbOpen * 2;
  const thumbRounds = Math.max(2, Math.round(handRounds * 0.4));
  const thumb = [];
  thumb.push({
    instruction: `Thumb: rejoin yarn at the thumb opening and work ${stitchName(stitch)} evenly into it — ${thumbOpen} stitches from the skipped edge and ${thumbOpen} from the chain edge. (${thumbSts} stitches)`,
    count: thumbSts,
    rounds: 1,
  });
  thumb.push(evenRow(thumbSts, stitch, thumbRounds));
  if (thumbSts > 6) thumb.push(spacedDecRow(thumbSts, Math.min(6, thumbSts / 2), stitch));
  for (const r of labelRounds(thumb, 'Thumb round')) rows.push(r);
  rows.push(noteRow('Finishing', 'Fasten off leaving a tail; close the thumb tip through the remaining stitches and weave in all ends.'));

  return {
    shape: 'mitten',
    worked: 'rounds',
    rows,
    maxStitchCount: handSts,
    finalCount: 6,
    meta: { size, ...sz, handSts, thumbSts },
  };
}

module.exports = {
  SWEATER_SIZES,
  SOCK_SIZES,
  MITTEN_SIZES,
  raglanSweater,
  sock,
  mitten,
};
