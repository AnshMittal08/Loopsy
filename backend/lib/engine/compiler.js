// ---------------------------------------------------------------------------
// Pattern Compiler — Design Spec → ordered steps with computed stitch counts.
//
// The compiler owns every number. Claude may write friendly prose AROUND the
// engine's output, but stitch counts here are arithmetic, never generated.
// ---------------------------------------------------------------------------

const { resolveGauge } = require('./gauge');
const { SHAPE_GENERATORS } = require('./shapes');
const { normalizeDesignSpec, validateDesignSpec } = require('./designSpec');

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

  for (const part of spec.parts) {
    const generate = SHAPE_GENERATORS[part.shape];
    const generated = generate(part.dimensions, gauge, part.stitch || defaultStitch);

    const qty = part.quantity > 1 ? ` (make ${part.quantity})` : '';
    const color = part.color ? ` — in ${part.color} yarn` : '';
    const partLabel = `${part.name}${qty}`;

    steps.push({
      instruction: `${partLabel}${color}: work the following ${generated.worked === 'rounds' ? 'in continuous rounds' : 'back and forth in rows'}.`,
    });

    for (const row of generated.rows) {
      const label = row.label ? `${partLabel} — ${row.label}: ` : `${partLabel} — `;
      steps.push({ instruction: `${label}${row.instruction}`, stitchCount: row.count ?? undefined });
    }

    partSummaries.push({
      name: part.name,
      shape: part.shape,
      quantity: part.quantity,
      maxStitchCount: generated.maxStitchCount,
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
    materials: suggestMaterials(spec, gauge),
  };
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

function suggestMaterials(spec, gauge) {
  const colors = [...new Set(spec.parts.map((p) => p.color).filter(Boolean))];
  const yarnLine = colors.length
    ? `${spec.yarnWeight} yarn in ${colors.join(', ')}`
    : `${spec.yarnWeight} yarn`;
  const materials = [yarnLine, `${gauge.hook} hook`, 'Tapestry needle', 'Scissors'];
  if (spec.category.toLowerCase() === 'amigurumi') {
    materials.push('Polyfill stuffing', 'Stitch marker');
  }
  return materials;
}

module.exports = { compileDesignSpec };
