// ---------------------------------------------------------------------------
// Revolution engine — turn an arbitrary profile curve (radius as a function of
// height) into an exact amigurumi pattern worked in rounds.
//
// This is the "draw anything" core: the maker sculpts a silhouette, we sample
// the radius at each round height, convert circumference → stitch count, and
// shape between rounds with the even-distribution arithmetic. Every count is
// computed from geometry — never guessed.
//
//   round i:  r_i = profile(height_i)
//             target_i = round( 2π·r_i · stitchesPerCm )
//             shape from target_{i-1} → target_i
// ---------------------------------------------------------------------------

const { rowHeightCm } = require('./gauge');
const { shapeRow, decreaseRow, name } = require('./distribute');

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

function magicRingRow(count, stitch) {
  return { instruction: `Magic ring. ${count} ${name(stitch)} into ring. Pull ring closed. (${count} stitches)`, count, rounds: 1 };
}
function noteRow(label, instruction) {
  return { label, instruction, count: null, rounds: 0 };
}
function labelRounds(rows, unit = 'Round') {
  let at = 1;
  return rows.map((row) => {
    if (row.rounds === 0) return row;
    const label = row.rounds > 1 ? `${unit}s ${at}–${at + row.rounds - 1}` : `${unit} ${at}`;
    at += row.rounds;
    return { ...row, label };
  });
}

// Linear interpolation of radius (cm) at normalized height t∈[0,1].
function radiusAt(profile, t) {
  const pts = [...profile].sort((a, b) => a.t - b.t);
  if (t <= pts[0].t) return Math.max(0, pts[0].r);
  if (t >= pts[pts.length - 1].t) return Math.max(0, pts[pts.length - 1].r);
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i].t) {
      const a = pts[i - 1], b = pts[i];
      const f = (t - a.t) / (b.t - a.t || 1);
      return Math.max(0, a.r + f * (b.r - a.r));
    }
  }
  return Math.max(0, pts[pts.length - 1].r);
}

/**
 * Revolve a profile into a worked-in-rounds pattern.
 *
 * @param {{ heightCm: number, profile: Array<{t:number,r:number}> }} dims
 * @param {object} gauge  resolved gauge (stsPerCm, rowsPerCm, ...)
 * @param {string} stitch
 */
function revolve({ heightCm, profile }, gauge, stitch = 'sc') {
  const spc = gauge.stsPerCm;
  const h = Math.max(2, Number(heightCm) || 8);
  const prof = Array.isArray(profile) && profile.length >= 2
    ? profile
    : [{ t: 0, r: 0.3 }, { t: 0.5, r: h * 0.18 }, { t: 1, r: 0.3 }];

  const nRounds = Math.max(4, Math.round(h / rowHeightCm(gauge, stitch)));

  // Target stitch count per round, bottom (t=0) → top (t=1).
  const targets = [];
  for (let i = 0; i < nRounds; i++) {
    const t = i / (nRounds - 1);
    const r = radiusAt(prof, t);
    targets.push(Math.max(0, Math.round(2 * Math.PI * r * spc)));
  }
  const maxStitch = Math.max(6, ...targets);

  const rows = [magicRingRow(6, stitch)];
  let count = 6;
  let stuffed = false;
  const peak = Math.max(...targets);

  for (let i = 0; i < nRounds; i++) {
    let tgt = Math.max(6, targets[i]);
    // A round can at most double or halve — clamp so shaping stays physical.
    tgt = Math.min(tgt, count * 2);
    tgt = Math.max(tgt, Math.ceil(count / 2));
    if (tgt === count && i !== 0) {
      // merge consecutive even rounds for readability
      const last = rows[rows.length - 1];
      if (last && last.count === count && /each stitch around/.test(last.instruction) && last.rounds >= 1) {
        last.rounds += 1;
        last.instruction = last.instruction.replace(/\(\d+ stitches(?: each round)?\)/, `(${count} stitches each round)`);
        continue;
      }
    }
    const row = shapeRow(count, tgt, stitch);
    rows.push(row);
    count = row.count;
    // Stuff once we're past the widest point and starting to close.
    if (!stuffed && count <= Math.max(12, peak * 0.55) && i > nRounds / 2) {
      rows.push(noteRow('Stuffing', 'Begin stuffing firmly with polyfill, adding more as the piece narrows.'));
      stuffed = true;
    }
  }

  // Close or finish the top.
  const topClosed = targets[targets.length - 1] <= Math.round(2 * Math.PI * 1.4 * spc);
  if (topClosed) {
    if (!stuffed) rows.push(noteRow('Stuffing', 'Stuff firmly with polyfill before closing.'));
    while (count > 6) {
      const next = Math.max(6, count - 6);
      rows.push(decreaseRow(count, count - next, stitch));
      count = next;
    }
    rows.push(noteRow('Finishing', 'Fasten off leaving a long tail. Thread through the front loops of the remaining stitches, pull tight to close, and weave in the end.'));
  } else {
    rows.push(noteRow('Finishing', `Fasten off leaving a long tail for sewing. (${count} stitches at the opening)`));
  }

  return {
    shape: 'revolve',
    worked: 'rounds',
    rows: labelRounds(rows),
    maxStitchCount: maxStitch,
    finalCount: count,
  };
}

module.exports = { revolve, radiusAt };
