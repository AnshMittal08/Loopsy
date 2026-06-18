const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validatePattern } = require('../lib/engine/validator');

const steps = (arr) => arr.map((instruction, i) => ({ row: i + 1, instruction }));

test('verifies a correct amigurumi increase/decrease run', () => {
  const v = validatePattern(steps([
    'Magic ring. 6 single crochet into ring. (6 stitches)',
    '2 single crochet in each stitch around. (12 stitches)',
    '[Single crochet in next stitch, 2 single crochet in next stitch] repeat 6 times. (18 stitches)',
    'Single crochet in each stitch around. (18 stitches)',
    '[Single crochet in next stitch, single crochet 2 together] repeat 6 times. (12 stitches)',
  ]));
  assert.equal(v.issues.length, 0);
  assert.ok(v.verified);
});

test('FLAGS a wrong stitch count (the core regression guard)', () => {
  const v = validatePattern(steps([
    'Magic ring. 6 single crochet into ring. (6 stitches)',
    '2 single crochet in each stitch around. (12 stitches)',
    '[Single crochet in next stitch, 2 single crochet in next stitch] repeat 6 times. (20 stitches)', // wrong: should be 18
  ]));
  assert.ok(v.issues.length >= 1, 'must catch the bad round');
  assert.equal(v.issues[0].expected, 18);
  assert.equal(v.issues[0].declared, 20);
});

test('sums a multi-segment distributed round correctly', () => {
  const v = validatePattern(steps([
    'Magic ring. 6 single crochet into ring. (6 stitches)',
    '2 single crochet in each stitch around. (12 stitches)',
    '2 single crochet in each of the next 4 stitches, then [Single crochet in next stitch, 2 single crochet in next stitch] repeat 4 times. (20 stitches)',
  ]));
  assert.equal(v.issues.length, 0, JSON.stringify(v.issues));
});

test('skips cluster/granny rounds rather than mis-flagging', () => {
  const v = validatePattern(steps([
    'Magic ring. Chain 3 (counts as first double crochet), 2 double crochet in ring, chain 2, [3 double crochet in ring, chain 2] repeat 3 times. (12 stitches)',
    'Slip stitch to corner. [3 double crochet, chain 2, 3 double crochet] in each corner space around. (24 stitches)',
  ]));
  assert.equal(v.issues.length, 0, 'cluster rounds must not be flagged');
});

test('badge is earned, not given: too few checkable rounds → not verified', () => {
  const v = validatePattern(steps([
    'Chain 20. (20 chains)',
    'Single crochet in each stitch across. (19 stitches)',
  ]));
  assert.equal(v.verified, false);
});
