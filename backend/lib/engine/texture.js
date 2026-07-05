// ---------------------------------------------------------------------------
// Stitch textures (E2) — bobble, popcorn, shell, ribbing.
//
// A texture is a count-neutral rewrite of a shape's plain even rounds/rows:
// the fabric gains surface interest but every round still consumes and
// produces exactly the same number of stitches, so the validator's
// re-derivation (and the "Verified math ✓" badge) is unaffected.
//
// Grammar contract with the validator:
//   bobble/popcorn  "[Bobble in next stitch, sc in next K stitches] repeat R times."
//                   consumed = produced = R × (K + 1)
//   shell           "[Skip next 2 stitches, 5 dc in next stitch, skip next 2
//                    stitches, sc in next stitch] repeat R times."
//                   consumed = produced = R × 6
//   ribbing         "Working in back loops only, <plain even round>."
//                   (matches the validator's existing even-round rule)
// ---------------------------------------------------------------------------

const TEXTURES = ['bobble', 'popcorn', 'shell', 'ribbing'];

const CLUSTER_EXPLAINER = {
  bobble:
    'Bobble = work 5 double crochet together in the same stitch: [yarn over, insert hook, pull up a loop, yarn over, pull through 2 loops] 5 times in one stitch, then yarn over and pull through all 6 loops. Each bobble counts as 1 stitch.',
  popcorn:
    'Popcorn = work 5 double crochet in the same stitch, drop the loop, insert the hook in the first of the 5 and pull the dropped loop through. Each popcorn counts as 1 stitch.',
  shell:
    'Shell = 5 double crochet worked in a single stitch, flanked by skipped stitches. Each 6-stitch repeat consumes and produces 6 stitches, so counts are unchanged.',
  ribbing:
    'Working in back loops only leaves the front loops as ridges — after a few rounds the fabric reads as ribbing. Stitch counts are unchanged.',
};

const STITCH_SHORT = { sc: 'single crochet', hdc: 'half double crochet', dc: 'double crochet' };

// Pick the bobble spacing K (plain stitches between bobbles) so (K+1) divides
// the round's count. Engine counts are multiples of 6, so K=3 (every 4th) when
// divisible by 4, else K=2 (every 3rd). Returns null when nothing divides.
function bobbleSpacing(count) {
  for (const k of [3, 2, 5, 1]) {
    if (count % (k + 1) === 0) return k;
  }
  return null;
}

function isPlainEven(row) {
  return (
    row &&
    Number(row.rounds) >= 1 &&
    typeof row.count === 'number' &&
    /^(?:Single crochet|Half double crochet|Double crochet) in each stitch (?:around|across)\./.test(row.instruction)
  );
}

function clusterRow(kind, count, stitch, rounds, suffix) {
  const k = bobbleSpacing(count);
  if (k == null) return null;
  const reps = count / (k + 1);
  const name = STITCH_SHORT[stitch] || STITCH_SHORT.sc;
  const word = kind === 'popcorn' ? 'Popcorn' : 'Bobble';
  const span = k === 1 ? 'next stitch' : `next ${k} stitches`;
  const tail = rounds > 1 ? `(${count} stitches each round)` : `(${count} stitches)`;
  return {
    instruction: `[${word} in next stitch, ${name} in ${span}] repeat ${reps} times. ${tail}${suffix || ''}`,
    count,
    rounds,
  };
}

function shellRow(count, rounds, suffix) {
  if (count % 6 !== 0) return null;
  const reps = count / 6;
  const tail = rounds > 1 ? `(${count} stitches each round)` : `(${count} stitches)`;
  return {
    instruction: `[Skip next 2 stitches, 5 double crochet in next stitch, skip next 2 stitches, single crochet in next stitch] repeat ${reps} times. ${tail}${suffix || ''}`,
    count,
    rounds,
  };
}

// "Rounds 6–10" → ["Round 6" … "Round 10"]; "Body rounds 2–6" → "Body round 2" ….
// Labels that aren't a recognizable range are simply repeated.
function splitRangeLabels(label, rounds) {
  const m = label && label.match(/^(.*?)s\s+(\d+)[–-]\d+$/);
  if (!m) return Array.from({ length: rounds }, () => label);
  const start = parseInt(m[2], 10);
  return Array.from({ length: rounds }, (_, i) => `${m[1]} ${start + i}`);
}

function ribbingRow(row) {
  return {
    ...row,
    instruction: `Working in back loops only, ${row.instruction.charAt(0).toLowerCase()}${row.instruction.slice(1)}`,
  };
}

/**
 * Rewrite a generated shape's plain even rounds/rows with a texture.
 * Shaping rounds (increases/decreases) and notes always pass through
 * untouched, so the silhouette math never changes.
 *
 * @param {{worked: string, rows: Array}} generated a SHAPE_GENERATORS result
 * @param {string} texture one of TEXTURES
 * @param {string} stitch the part's stitch ('sc' | 'hdc' | 'dc')
 * @returns {{worked: string, rows: Array}} generated, with rows rewritten
 */
function applyTexture(generated, texture, stitch = 'sc') {
  if (!TEXTURES.includes(texture)) return generated;
  const over = generated.worked === 'rounds' ? 'around' : 'across';
  const rows = [];
  let explained = false;
  let textured = false;

  const explainOnce = () => {
    if (!explained) {
      rows.push({ label: 'Texture', instruction: CLUSTER_EXPLAINER[texture], count: null, rounds: 0 });
      explained = true;
    }
  };

  for (const row of generated.rows) {
    if (!isPlainEven(row)) {
      rows.push(row);
      continue;
    }
    // The chain/turn tail on flat rows ("Chain 1, turn. …") must survive the
    // rewrite; everything after the canonical sentence + declared count is kept.
    const m = row.instruction.match(/^.*?in each stitch (?:around|across)\.\s*\((?:\d+)[^)]*\)(.*)$/);
    const suffix = m && m[1] ? m[1] : '';

    if (texture === 'ribbing') {
      explainOnce();
      rows.push(ribbingRow(row));
      textured = true;
      continue;
    }

    if (texture === 'shell') {
      const shell = shellRow(row.count, row.rounds, suffix);
      if (shell) {
        explainOnce();
        rows.push({ ...row, ...shell });
        textured = true;
      } else {
        rows.push(row);
      }
      continue;
    }

    // bobble / popcorn: alternate texture and plain rounds so the clusters
    // have a settled round beneath them (standard practice). A multi-round
    // range is split into explicit alternating single rounds.
    const cluster = clusterRow(texture, row.count, stitch, 1, suffix);
    if (!cluster) {
      rows.push(row);
      continue;
    }
    explainOnce();
    textured = true;
    if (row.rounds === 1) {
      rows.push({ ...row, ...cluster });
      continue;
    }
    // Split the range into explicit alternating single rounds, deriving each
    // label from the range label ("Rounds 6–10" → "Round 6" … "Round 10").
    const labels = splitRangeLabels(row.label, row.rounds);
    const name = STITCH_SHORT[stitch] || STITCH_SHORT.sc;
    for (let i = 0; i < row.rounds; i++) {
      if (i % 2 === 0) {
        rows.push({ ...row, ...cluster, rounds: 1, label: labels[i] });
      } else {
        rows.push({
          ...row,
          instruction: `${name.charAt(0).toUpperCase()}${name.slice(1)} in each stitch ${over}. (${row.count} stitches)${suffix}`,
          rounds: 1,
          label: labels[i],
        });
      }
    }
  }

  return { ...generated, rows, texture: textured ? texture : undefined };
}

module.exports = { TEXTURES, applyTexture };
