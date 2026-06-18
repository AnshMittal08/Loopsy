// ---------------------------------------------------------------------------
// Colorwork chart engine — turn ANY 2D pixel drawing into an exact crochet
// pattern. Each cell of the grid is one single crochet of a colour, worked
// flat in rows (tapestry / graphgan). Counts are trivially exact: every row
// has `cols` stitches. This is the "draw anything 2D" path — shields, logos,
// portraits, letters, patterned blankets and scarves.
//
//   grid[r][c] = colour name. Row 1 is the BOTTOM of the picture, worked first.
//   Even working rows go one way, odd rows the other (boustrophedon); the
//   run-lengths are emitted in working order so the written text "just works".
// ---------------------------------------------------------------------------

const { resolveGauge, rowHeightCm } = require('./gauge');
const { increaseRow } = require('./distribute');
const { colorName } = require('./colorName');

// Run-length encode a row of colours → "4 cream, 2 red, 4 cream". Colours may
// be palette names or arbitrary hex; both are named for the written pattern.
function encodeRow(cells) {
  const runs = [];
  let cur = cells[0], n = 1;
  for (let i = 1; i < cells.length; i++) {
    if (cells[i] === cur) n++;
    else { runs.push(`${n} ${colorName(cur)}`); cur = cells[i]; n = 1; }
  }
  runs.push(`${n} ${colorName(cur)}`);
  return runs.join(', ');
}

/**
 * Compile a colour grid into a flat colourwork pattern.
 *
 * @param {object} spec
 * @param {string} spec.name
 * @param {string} [spec.yarnWeight]
 * @param {number} spec.cols
 * @param {number} spec.rows
 * @param {string[][]} spec.grid   grid[row][col] colour name; row 0 = TOP
 * @returns {{ ok, steps, materials, hookSize, yarnWeight, finishedSize, colors }}
 */
function compileChart(spec) {
  const yarnWeight = spec.yarnWeight || 'Worsted';
  const cols = Math.max(2, Math.round(spec.cols));
  const rows = Math.max(2, Math.round(spec.rows));
  const grid = spec.grid;
  if (!Array.isArray(grid) || grid.length !== rows || grid.some((r) => !Array.isArray(r) || r.length !== cols)) {
    return { ok: false, errors: ['Grid dimensions do not match cols/rows.'] };
  }

  const gauge = resolveGauge(yarnWeight);
  const colors = [...new Set(grid.flat())];

  const steps = [];
  steps.push({ instruction: `Foundation: Chain ${cols + 1}. (${cols + 1} chains)` });

  // Work from the bottom of the picture up. grid[0] is the top, so the first
  // worked row is grid[rows-1].
  for (let w = 0; w < rows; w++) {
    const gridRow = grid[rows - 1 - w];
    const leftToRight = w % 2 === 0;
    const worked = leftToRight ? gridRow : [...gridRow].slice().reverse();
    const dir = leftToRight ? 'left to right' : 'right to left';
    const rle = encodeRow(worked);
    if (w === 0) {
      steps.push({
        instruction: `Row 1: Single crochet in the 2nd chain from hook and in each chain across, following the chart (${dir}): ${rle}. (${cols} stitches) Chain 1, turn.`,
        stitchCount: cols,
      });
    } else {
      const turn = w === rows - 1 ? '' : ' Chain 1, turn.';
      steps.push({
        instruction: `Row ${w + 1}: Single crochet in each stitch across, following the chart (${dir}): ${rle}. (${cols} stitches)${turn}`,
        stitchCount: cols,
      });
    }
  }

  steps.push({
    instruction: 'Finishing: Fasten off and weave in all ends. Carry unused colours loosely across the back of the work, or use a separate bobbin per colour block (intarsia) for cleaner large areas.',
  });

  const numbered = steps.map((s, i) => ({ row: i + 1, ...s }));

  const widthCm = Math.round((cols / gauge.stsPerCm) * 10) / 10;
  const heightCm = Math.round((rows / gauge.rowsPerCm) * 10) / 10;

  const materials = [
    ...[...new Set(colors.map(colorName))].map((c) => `${yarnWeight} yarn in ${c}`),
    `${gauge.hook} hook`,
    'Tapestry needle',
    'Scissors',
  ];

  return {
    ok: true,
    steps: numbered,
    materials,
    hookSize: gauge.hook,
    yarnWeight,
    finishedSize: `${widthCm} × ${heightCm} cm (${cols} × ${rows} stitches)`,
    colors,
    stitchTotal: cols * rows,
  };
}

// ---------------------------------------------------------------------------
// Medallion engine — turn a circular drawing into a piece worked in the round
// (a real 3D disc/dome, not a flat blanket). The flat-circle increase math
// gives an exact stitch count per round; we then assign every stitch a colour
// by sampling the drawing in polar coordinates, so the picture is crocheted
// right into the fabric. This makes a "3D shield", badge, medallion, mandala,
// or round face.
// ---------------------------------------------------------------------------
function compileMedallion(spec) {
  const yarnWeight = spec.yarnWeight || 'Worsted';
  const grid = spec.grid;
  const W = Math.min(spec.cols, spec.rows);
  if (!Array.isArray(grid) || !W) return { ok: false, errors: ['A square chart is required.'] };

  const gauge = resolveGauge(yarnWeight);
  const cx = (spec.cols - 1) / 2, cy = (spec.rows - 1) / 2;
  const maxR = W / 2 - 0.5;
  const K = Math.max(3, Math.round(W / 2)); // number of rounds

  // Sample the drawing at polar (ρ∈[0,1], angle θ from the top, clockwise).
  const sample = (rho, theta) => {
    const gx = cx + rho * maxR * Math.sin(theta);
    const gy = cy - rho * maxR * Math.cos(theta);
    const r = Math.max(0, Math.min(spec.rows - 1, Math.round(gy)));
    const c = Math.max(0, Math.min(spec.cols - 1, Math.round(gx)));
    return grid[r][c];
  };
  const roundColors = (k, stitches) => {
    const seq = [];
    for (let j = 0; j < stitches; j++) seq.push(sample(k / K, (2 * Math.PI * j) / stitches));
    return encodeRow(seq);
  };

  const steps = [];
  let count = 6;
  steps.push({ instruction: `Round 1: Magic ring, 6 single crochet into the ring, in these colours: ${roundColors(1, 6)}. (6 stitches)`, stitchCount: 6 });
  for (let k = 2; k <= K; k++) {
    const target = 6 * k;
    const inc = increaseRow(count, target - count, 'sc');
    const body = inc.instruction.replace(/\.\s*\(\d+ stitches\)\s*$/, '');
    steps.push({ instruction: `Round ${k}: ${body}, working these colours around: ${roundColors(k, target)}. (${target} stitches)`, stitchCount: target });
    count = target;
  }
  steps.push({ instruction: 'For a flat shield, fasten off here. For a domed shield, work 2 more rounds with no increases (single crochet in each stitch around) to cup the edge, then fasten off.' });
  steps.push({ instruction: 'Finishing: Fasten off and weave in all ends, keeping colour joins on the back.' });

  const numbered = steps.map((s, i) => ({ row: i + 1, ...s }));
  const diameterCm = Math.round(((2 * K) * rowHeightCm(gauge, 'sc')) * 10) / 10;
  const colors = [...new Set(grid.flat())];
  const materials = [...[...new Set(colors.map(colorName))].map((c) => `${yarnWeight} yarn in ${c}`), `${gauge.hook} hook`, 'Stitch marker', 'Tapestry needle'];

  return {
    ok: true,
    steps: numbered,
    materials,
    hookSize: gauge.hook,
    yarnWeight,
    finishedSize: `${diameterCm} cm diameter (${K} rounds, worked in the round)`,
    colors,
    stitchTotal: 3 * K * (K + 1),
  };
}

module.exports = { compileChart, compileMedallion, encodeRow };
