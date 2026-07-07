// US ↔ UK crochet terminology. Patterns are authored and verified in US
// terms; UK display is a single-pass rendering conversion so nothing is ever
// double-converted (US "double crochet" must become "treble", not be hit
// again by the sc→dc rule).

export const TERMS_KEY = 'loopsy:terms'; // 'us' (default) | 'uk'

// Longest-first so multi-word names win the alternation.
const US_TO_UK = [
  ['half double crochet', 'half treble crochet'],
  ['treble crochet', 'double treble crochet'],
  ['double crochet', 'treble crochet'],
  ['single crochet', 'double crochet'],
  ['hdc', 'htr'],
  ['tr', 'dtr'],
  ['dc', 'tr'],
  ['sc', 'dc'],
];

const PATTERN = new RegExp(
  `\\b(${US_TO_UK.map(([us]) => us).join('|')})\\b`,
  'gi'
);
const LOOKUP = Object.fromEntries(US_TO_UK);

/** Convert one instruction string from US to UK terms (single pass). */
export function toUkTerms(text) {
  if (!text) return text;
  return String(text).replace(PATTERN, (match) => {
    const uk = LOOKUP[match.toLowerCase()];
    if (!uk) return match;
    // Preserve leading capitalisation ("Single crochet" → "Double crochet").
    return match[0] === match[0].toUpperCase()
      ? uk.charAt(0).toUpperCase() + uk.slice(1)
      : uk;
  });
}

export function renderTerms(text, mode) {
  return mode === 'uk' ? toUkTerms(text) : text;
}

export function readTermsPref() {
  try { return localStorage.getItem(TERMS_KEY) === 'uk' ? 'uk' : 'us'; } catch { return 'us'; }
}

export function writeTermsPref(mode) {
  try { localStorage.setItem(TERMS_KEY, mode === 'uk' ? 'uk' : 'us'); } catch { /* blocked */ }
}
