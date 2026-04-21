// Ordered from longest to shortest to prevent partial replacements
const ABBREVIATIONS = [
  ['sc2tog', 'single crochet 2 together (decrease)'],
  ['dc2tog', 'double crochet 2 together (decrease)'],
  ['hdc2tog', 'half double crochet 2 together (decrease)'],
  ['magic ring', 'adjustable magic ring'],
  ['sl st', 'slip stitch'],
  ['ch sp', 'chain space'],
  ['BLO', 'back loops only'],
  ['FLO', 'front loops only'],
  ['hdc', 'half double crochet'],
  ['dtr', 'double treble crochet'],
  ['trc', 'treble crochet'],
  ['beg', 'beginning'],
  ['cont', 'continue'],
  ['inc', 'increase'],
  ['dec', 'decrease'],
  ['tog', 'together'],
  ['rep', 'repeat'],
  ['rnd', 'round'],
  ['rem', 'remaining'],
  ['sk', 'skip'],
  ['sp', 'space'],
  ['pm', 'place marker'],
  ['sm', 'slip marker'],
  ['yo', 'yarn over'],
  ['ch', 'chain'],
  ['dc', 'double crochet'],
  ['tr', 'treble crochet'],
  ['sc', 'single crochet'],
  ['st', 'stitch'],
  ['sts', 'stitches'],
];

// Word-boundary aware replacement: only match whole words/tokens
export function expandAbbreviations(text) {
  if (!text) return text;
  let result = text;
  for (const [abbr, full] of ABBREVIATIONS) {
    // Match abbreviation as a whole word (surrounded by non-word chars or start/end)
    const escaped = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![a-zA-Z])${escaped}(?![a-zA-Z])`, 'g');
    result = result.replace(regex, full);
  }
  return result;
}
