// Pattern Engine — deterministic crochet geometry (plan-v2 M2).
// Stitch counts are computed, never guessed.

const { resolveGauge, normalizeYarnWeight, GAUGE_BY_WEIGHT } = require('./gauge');
const { SHAPE_GENERATORS, HAT_SIZES } = require('./shapes');
const { SUPPORTED_SHAPES, SUPPORTED_STITCHES, normalizeDesignSpec, validateDesignSpec } = require('./designSpec');
const { compileDesignSpec } = require('./compiler');
const { validatePattern } = require('./validator');

module.exports = {
  resolveGauge,
  normalizeYarnWeight,
  GAUGE_BY_WEIGHT,
  SHAPE_GENERATORS,
  HAT_SIZES,
  SUPPORTED_SHAPES,
  SUPPORTED_STITCHES,
  normalizeDesignSpec,
  validateDesignSpec,
  compileDesignSpec,
  validatePattern,
};
