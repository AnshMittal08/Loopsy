// ---------------------------------------------------------------------------
// Pattern Compiler — Design Spec → ordered steps with computed stitch counts.
//
// The compiler owns every number. Claude may write friendly prose AROUND the
// engine's output, but stitch counts here are arithmetic, never generated.
// ---------------------------------------------------------------------------

const { resolveGauge } = require('./gauge');
const { SHAPE_GENERATORS } = require('./shapes');
const { normalizeDesignSpec, validateDesignSpec } = require('./designSpec');
const { colorName } = require('./colorName');
const { applyTexture } = require('./texture');
const { estimatePartYarn, formatYarnAmount } = require('./yardage');

/**
 * Compile a Design Spec into pattern steps.
 *
 * @param {object} rawSpec a Design Spec (raw — will be normalized)
 * @returns {{
 *   ok: boolean, errors?: string[],
 *   steps?: Array<{row: number, instruction: string}>,
 *   spec?: object, gauge?: object,
 *   hookSize?: string, yarnWeight?: string, finishedSize?: string,
 *   materials?: string[]
 * }}
 */
function compileDesignSpec(rawSpec) {
  const spec = normalizeDesignSpec(rawSpec);
  const { valid, errors } = validateDesignSpec(spec);
  if (!valid) {
    return { ok: false, errors, spec };
  }

  const tight = spec.category.toLowerCase() === 'amigurumi';
  const gauge = resolveGauge(spec.yarnWeight, { tight });
  const defaultStitch = 'sc';

  const steps = [];
  const partSummaries = [];
  // Yarn totals, split by colour so the materials list is shoppable.
  const yarnByColor = new Map(); // colorName → { meters, grams }
  let yarnTotal = { meters: 0, grams: 0 };

  const addYarn = (key, y, share = 1) => {
    const cur = yarnByColor.get(key) || { meters: 0, grams: 0 };
    yarnByColor.set(key, { meters: cur.meters + y.meters * share, grams: cur.grams + y.grams * share });
  };

  for (const part of spec.parts) {
    const generate = SHAPE_GENERATORS[part.shape];
    let generated = generate(part.dimensions, gauge, part.stitch || defaultStitch);
    if (part.texture) {
      // Count-neutral rewrite of plain even rounds/rows — silhouette math and
      // the validator's re-derivation are unaffected.
      generated = applyTexture(generated, part.texture, part.stitch || defaultStitch);
    }

    const qty = part.quantity > 1 ? ` (make ${part.quantity})` : '';
    const textured = generated.texture ? ` with ${generated.texture} texture` : '';
    const worked = `${generated.worked === 'rounds' ? 'in continuous rounds' : 'back and forth in rows'}${textured}`;
    const partLabel = `${part.name}${qty}`;

    if (part.colorPlan) {
      // Striped part: the preamble names the starting colour; colour-change
      // notes are inserted at stripe boundaries as count-less steps.
      const first = colorName(part.colorPlan.colors[0]);
      steps.push({ instruction: `${partLabel} — starting in ${first} yarn: work the following ${worked}.` });
      emitStripedRows(steps, partLabel, generated.rows, part.colorPlan);
    } else {
      const color = part.color ? ` — in ${colorName(part.color)} yarn` : '';
      steps.push({
        instruction: `${partLabel}${color}: work the following ${worked}.`,
      });
      for (const row of generated.rows) {
        const label = row.label ? `${partLabel} — ${row.label}: ` : `${partLabel} — `;
        steps.push({ instruction: `${label}${row.instruction}`, stitchCount: row.count ?? undefined });
      }
    }

    // Yarn estimate for this part (computed from the generated counts).
    const yarn = estimatePartYarn(generated, gauge, part.stitch || defaultStitch, {
      texture: generated.texture,
      quantity: part.quantity,
    });
    yarnTotal = { meters: yarnTotal.meters + yarn.meters, grams: yarnTotal.grams + yarn.grams };
    if (part.colorPlan) {
      // Stripes: split the part's yarn evenly across the plan's colours — an
      // honest approximation for even stripe cycles.
      for (const c of part.colorPlan.colors) addYarn(colorName(c), yarn, 1 / part.colorPlan.colors.length);
    } else {
      addYarn(part.color ? colorName(part.color) : 'main colour', yarn);
    }

    partSummaries.push({
      name: part.name,
      shape: part.shape,
      quantity: part.quantity,
      texture: generated.texture,
      maxStitchCount: generated.maxStitchCount,
      yarnMeters: Math.round(yarn.meters),
      meta: generated.meta,
    });
  }

  for (const assemblyStep of spec.assembly) {
    steps.push({ instruction: `Assembly: ${assemblyStep}` });
  }
  for (const embellishment of spec.embellishments) {
    steps.push({ instruction: `Embellishment: ${embellishment}` });
  }

  const numbered = steps.map((step, index) => ({ row: index + 1, ...step }));

  return {
    ok: true,
    spec,
    gauge,
    steps: numbered,
    parts: partSummaries,
    hookSize: gauge.hook,
    yarnWeight: spec.yarnWeight,
    finishedSize: describeFinishedSize(spec),
    materials: suggestMaterials(spec, gauge, yarnByColor),
    yardage: {
      totalMeters: Math.round(yarnTotal.meters),
      totalGrams: Math.round(yarnTotal.grams),
      perColor: [...yarnByColor.entries()].map(([color, y]) => ({
        color,
        meters: Math.round(y.meters),
        grams: Math.round(y.grams),
      })),
      note: 'Includes a 15% allowance for tails, tension and weaving in ends.',
    },
  };
}

// The colour band a 1-indexed round falls into, given the stripe plan.
function bandFor(round, plan) {
  return Math.floor((round - 1) / plan.stripeRounds) % plan.colors.length;
}

function roundLabel(a, b) {
  return a === b ? `Round ${a}` : `Rounds ${a}–${b}`;
}

/**
 * Emit a part's rows with stripe colour changes. Walks the running round
 * counter; when a row spans a stripe boundary it is split into sub-ranges so
 * each colour band gets its own labelled row. Stitch counts are never altered —
 * only the label is recomputed and a count-less "Change to … yarn" note is
 * inserted — so the validator re-derives identical counts.
 */
function emitStripedRows(steps, partLabel, rows, plan) {
  let round = 1;
  let activeBand = 0; // preamble already declared colors[0]
  for (const row of rows) {
    const span = Number(row.rounds) > 0 ? Number(row.rounds) : 0;
    // Rows that don't advance rounds (finishing notes, stuffing) pass through.
    if (span === 0 || !row.label || !/^Rounds?\s/i.test(row.label)) {
      const label = row.label ? `${partLabel} — ${row.label}: ` : `${partLabel} — `;
      steps.push({ instruction: `${label}${row.instruction}`, stitchCount: row.count ?? undefined });
      round += span;
      continue;
    }
    // Split [round .. round+span-1] into maximal constant-band sub-ranges.
    let start = round;
    const end = round + span - 1;
    while (start <= end) {
      const band = bandFor(start, plan);
      let stop = start;
      while (stop + 1 <= end && bandFor(stop + 1, plan) === band) stop += 1;
      if (band !== activeBand) {
        steps.push({ instruction: `${partLabel} — Change to ${colorName(plan.colors[band])} yarn.` });
        activeBand = band;
      }
      steps.push({
        instruction: `${partLabel} — ${roundLabel(start, stop)}: ${row.instruction}`,
        stitchCount: row.count ?? undefined,
      });
      start = stop + 1;
    }
    round += span;
  }
}

function describeFinishedSize(spec) {
  const dims = [];
  for (const part of spec.parts) {
    const d = part.dimensions;
    if (d.diameterCm) dims.push(d.diameterCm);
    if (d.heightCm) dims.push(d.heightCm);
    if (d.widthCm) dims.push(d.widthCm);
    if (d.baseDiameterCm) dims.push(d.baseDiameterCm);
    if (d.sideCm) dims.push(d.sideCm);
  }
  if (!dims.length) return 'See pattern';
  const largest = Math.max(...dims);
  return `Approximately ${largest} cm (${Math.round(largest / 2.54)} in) at the largest dimension`;
}

function suggestMaterials(spec, gauge, yarnByColor) {
  // One shoppable line per colour, with a computed amount: the engine knows
  // every stitch, so it can also say how much yarn those stitches consume.
  const materials = [...yarnByColor.entries()].map(
    ([color, y]) => `${spec.yarnWeight} yarn in ${color} — ${formatYarnAmount(y)}`
  );
  if (materials.length === 0) materials.push(`${spec.yarnWeight} yarn`);
  materials.push(`${gauge.hook} hook`, 'Tapestry needle', 'Scissors');
  if (spec.category.toLowerCase() === 'amigurumi') {
    materials.push('Polyfill stuffing', 'Stitch marker');
  }
  return materials;
}

module.exports = { compileDesignSpec };
