// Ordered from longest to shortest to prevent partial replacements
const ABBREVIATIONS = [
  {
    abbr: 'sc2tog',
    full: 'single crochet 2 together (decrease)',
    explanation: 'Insert your hook into the next stitch and pull up a loop, then do the same in the following stitch. Yarn over and pull through all three loops on your hook to merge two stitches into one.',
    videoUrl: 'https://www.youtube.com/watch?v=PqIKokMR8q0',
    videoLabel: 'Bella Coco — Decrease Tutorial',
    category: 'decrease',
  },
  {
    abbr: 'dc2tog',
    full: 'double crochet 2 together (decrease)',
    explanation: 'Yarn over, insert hook into next stitch and pull through two loops. Yarn over, insert into the next stitch and pull through two loops. Yarn over and pull through all three remaining loops to join them.',
    videoUrl: 'https://www.youtube.com/watch?v=PqIKokMR8q0',
    videoLabel: 'Bella Coco — Decrease Tutorial',
    category: 'decrease',
  },
  {
    abbr: 'hdc2tog',
    full: 'half double crochet 2 together (decrease)',
    explanation: 'Yarn over, insert hook into next stitch and pull up a loop. Yarn over, insert into the following stitch and pull up another loop. Yarn over and pull through all five loops on hook at once.',
    videoUrl: 'https://www.youtube.com/watch?v=PqIKokMR8q0',
    videoLabel: 'Bella Coco — Decrease Tutorial',
    category: 'decrease',
  },
  {
    abbr: 'magic ring',
    full: 'adjustable magic ring',
    explanation: 'Wrap yarn around your fingers to form an adjustable loop, then work your first stitches into that ring. Pull the yarn tail tight to close the center hole completely — essential for starting hats, amigurumi, and anything circular.',
    videoUrl: 'https://www.youtube.com/watch?v=KVm0qJBXgBc',
    videoLabel: 'Bella Coco — Magic Ring Tutorial',
    category: 'structure',
  },
  {
    abbr: 'sl st',
    full: 'slip stitch',
    explanation: 'Insert your hook into the stitch, yarn over, and pull through both the stitch and the loop on your hook in one motion. Used to join rounds, move across stitches without adding height, or create a flat seam.',
    videoUrl: 'https://www.youtube.com/watch?v=Fz6LfJmSMmY',
    videoLabel: 'TL Yarn Crafts — Slip Stitch',
    category: 'basic',
  },
  {
    abbr: 'ch sp',
    full: 'chain space',
    explanation: 'The open gap created by chain stitches in the previous row. Insert your hook into the space beneath the chains, not into the individual chain stitches themselves.',
    videoUrl: null,
    videoLabel: null,
    category: 'structure',
  },
  {
    abbr: 'BLO',
    full: 'back loops only',
    explanation: 'Insert your hook under only the back loop of the stitch — the loop farthest from you. This creates a visible ridge on the front of the work and adds texture and elasticity.',
    videoUrl: 'https://www.youtube.com/watch?v=URhNW5DfLHs',
    videoLabel: 'Bella Coco — BLO / FLO Tutorial',
    category: 'structure',
  },
  {
    abbr: 'FLO',
    full: 'front loops only',
    explanation: 'Insert your hook under only the front loop of the stitch — the loop closest to you. The unused back loop creates a decorative ridge on the opposite side of the fabric.',
    videoUrl: 'https://www.youtube.com/watch?v=URhNW5DfLHs',
    videoLabel: 'Bella Coco — BLO / FLO Tutorial',
    category: 'structure',
  },
  {
    abbr: 'hdc',
    full: 'half double crochet',
    explanation: 'Yarn over, insert hook into the stitch, pull up a loop (three loops on hook). Yarn over and pull through all three loops at once. Falls between single and double crochet in height.',
    videoUrl: 'https://www.youtube.com/watch?v=VzJex7eJzJo',
    videoLabel: 'Bella Coco — Half Double Crochet',
    category: 'basic',
  },
  {
    abbr: 'dtr',
    full: 'double treble crochet',
    explanation: 'Yarn over three times, insert hook, pull up a loop (five loops on hook). Yarn over and pull through two loops four separate times. Even taller than treble crochet, used in lace and specialty patterns.',
    videoUrl: 'https://www.youtube.com/watch?v=7bYBu_8bnDo',
    videoLabel: 'Bella Coco — Treble Crochet',
    category: 'basic',
  },
  {
    abbr: 'trc',
    full: 'treble crochet',
    explanation: 'Yarn over twice, insert hook into stitch, pull up a loop (four loops on hook). Yarn over and pull through two loops three separate times. Creates a very tall, open stitch.',
    videoUrl: 'https://www.youtube.com/watch?v=7bYBu_8bnDo',
    videoLabel: 'Bella Coco — Treble Crochet',
    category: 'basic',
  },
  {
    abbr: 'beg',
    full: 'beginning',
    explanation: 'The start of a row or round. Often appears in phrases like "beginning chain" to indicate the turning chain that starts a new row.',
    videoUrl: null,
    videoLabel: null,
    category: 'notation',
  },
  {
    abbr: 'cont',
    full: 'continue',
    explanation: 'Keep working in the established pattern without changing stitches or technique until told otherwise.',
    videoUrl: null,
    videoLabel: null,
    category: 'notation',
  },
  {
    abbr: 'inc',
    full: 'increase',
    explanation: 'Work two stitches into the same stitch from the previous row. This adds one stitch to your total count, making the piece wider or causing a flat circle to grow outward.',
    videoUrl: 'https://www.youtube.com/watch?v=HY8s6RIx6es',
    videoLabel: 'Bella Coco — Increase & Decrease',
    category: 'increase',
  },
  {
    abbr: 'dec',
    full: 'decrease',
    explanation: 'Combine two adjacent stitches into one by partially working each, then finishing them together. This removes one stitch from your total count, narrowing the piece or shaping curves.',
    videoUrl: 'https://www.youtube.com/watch?v=PqIKokMR8q0',
    videoLabel: 'Bella Coco — Decrease Tutorial',
    category: 'decrease',
  },
  {
    abbr: 'tog',
    full: 'together',
    explanation: 'Work the specified stitches together, combining them into a single stitch. This is the general term for any decrease where multiple stitches merge at the top.',
    videoUrl: null,
    videoLabel: null,
    category: 'decrease',
  },
  {
    abbr: 'rep',
    full: 'repeat',
    explanation: 'Work the described sequence of stitches again. Usually given with a count like "repeat 6 times" or "repeat to end of row."',
    videoUrl: null,
    videoLabel: null,
    category: 'notation',
  },
  {
    abbr: 'rnd',
    full: 'round',
    explanation: 'One complete circuit around your work when crocheting in the round. Unlike rows, rounds are continuous and often joined with a slip stitch.',
    videoUrl: null,
    videoLabel: null,
    category: 'notation',
  },
  {
    abbr: 'rem',
    full: 'remaining',
    explanation: 'The stitches that are left unworked in the current row or round. Often seen in instructions like "work in remaining stitches."',
    videoUrl: null,
    videoLabel: null,
    category: 'notation',
  },
  {
    abbr: 'sk',
    full: 'skip',
    explanation: 'Pass over the next stitch without working into it. Commonly used to create spaces in lace patterns or to position stitches for shell and fan motifs.',
    videoUrl: null,
    videoLabel: null,
    category: 'notation',
  },
  {
    abbr: 'sp',
    full: 'space',
    explanation: 'The gap or opening between stitches, usually created by chain stitches. Work into the space itself, not into the individual chains.',
    videoUrl: null,
    videoLabel: null,
    category: 'structure',
  },
  {
    abbr: 'pm',
    full: 'place marker',
    explanation: 'Slide a stitch marker onto your hook or into the current stitch to mark your position. Markers help you track the beginning of rounds, increase points, or pattern repeats.',
    videoUrl: null,
    videoLabel: null,
    category: 'notation',
  },
  {
    abbr: 'sm',
    full: 'slip marker',
    explanation: 'Move the stitch marker from the previous round up to the current round as you pass it. This keeps your place marker current with each round of work.',
    videoUrl: null,
    videoLabel: null,
    category: 'notation',
  },
  {
    abbr: 'yo',
    full: 'yarn over',
    explanation: 'Wrap the working yarn over your hook from back to front. This is the fundamental motion in almost every crochet stitch and is also used to create decorative holes in lace patterns.',
    videoUrl: 'https://www.youtube.com/watch?v=GcOzdAzmtNM',
    videoLabel: 'Bella Coco — Chain & Yarn Over',
    category: 'basic',
  },
  {
    abbr: 'ch',
    full: 'chain',
    explanation: 'Yarn over and pull through the loop on your hook to create one chain link. Chains form the starting foundation of most projects and are used for turning at the end of rows.',
    videoUrl: 'https://www.youtube.com/watch?v=GcOzdAzmtNM',
    videoLabel: 'Bella Coco — Chain Stitch Tutorial',
    category: 'basic',
  },
  {
    abbr: 'dc',
    full: 'double crochet',
    explanation: 'Yarn over, insert hook into the stitch, pull up a loop (three loops on hook). Yarn over and pull through two loops, then yarn over and pull through the remaining two. Creates an open, drapey fabric.',
    videoUrl: 'https://www.youtube.com/watch?v=h1ey6gOhBFQ',
    videoLabel: 'Bella Coco — Double Crochet',
    category: 'basic',
  },
  {
    abbr: 'tr',
    full: 'treble crochet',
    explanation: 'Yarn over twice before inserting your hook. Pull up a loop (four loops on hook), then yarn over and pull through two loops three separate times until one loop remains.',
    videoUrl: 'https://www.youtube.com/watch?v=7bYBu_8bnDo',
    videoLabel: 'Bella Coco — Treble Crochet',
    category: 'basic',
  },
  {
    abbr: 'sc',
    full: 'single crochet',
    explanation: 'Insert your hook into the next stitch, yarn over and pull up a loop (two loops on hook). Yarn over again and pull through both loops. The shortest and tightest of the basic stitches.',
    videoUrl: 'https://www.youtube.com/watch?v=aAxGTnVNJiE',
    videoLabel: 'Bella Coco — Single Crochet',
    category: 'basic',
  },
  {
    abbr: 'st',
    full: 'stitch',
    explanation: 'A single loop of yarn pulled through another — the fundamental unit of crochet. Each stitch type has a different height and texture.',
    videoUrl: null,
    videoLabel: null,
    category: 'notation',
  },
  {
    abbr: 'sts',
    full: 'stitches',
    explanation: 'Plural form of stitch — refers to multiple individual stitch units in a row or round.',
    videoUrl: null,
    videoLabel: null,
    category: 'notation',
  },
];

export { ABBREVIATIONS };

export function getAbbreviationData(term) {
  const lower = term.toLowerCase();
  return ABBREVIATIONS.find(
    (a) => a.abbr.toLowerCase() === lower || a.full.toLowerCase() === lower
  ) || null;
}

export function expandAbbreviations(text) {
  if (!text) return text;
  let result = text;
  for (const { abbr, full } of ABBREVIATIONS) {
    const escaped = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![a-zA-Z])${escaped}(?![a-zA-Z])`, 'g');
    result = result.replace(regex, full);
  }
  return result;
}
