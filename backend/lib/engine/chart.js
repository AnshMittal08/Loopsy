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

const { resolveGauge } = require('./gauge');

// Run-length encode a row of colour names → "4 cream, 2 red, 4 cream".
function encodeRow(cells) {
  const runs = [];
  let cur = cells[0], n = 1;
  for (let i = 1; i < cells.length; i++) {
    if (cells[i] === cur) n++;
    else { runs.push(`${n} ${cur}`); cur = cells[i]; n = 1; }
  }
  runs.push(`${n} ${cur}`);
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
    ...colors.map((c) => `${yarnWeight} yarn in ${c}`),
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

module.exports = { compileChart, encodeRow };
