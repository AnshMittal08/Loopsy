// Learning Centre content — technique guides + the guided beginner path.
//
// The stitch GLOSSARY is NOT duplicated here: it is sourced from the existing
// `crochetAbbreviations.js` (the same vocabulary that powers tracker tooltips),
// so there is one source of truth. This module adds the longer-form technique
// guides and the lesson path that sequences the beginner templates.

// Each guide: { slug, title, category, minutes, summary, sections:[{heading, body}],
//   related:[slug], stitches:[abbr] }. Body is plain prose (rendered as paragraphs).
export const GUIDES = [
  {
    slug: 'how-to-read-a-loopsy-pattern',
    title: 'How to read a Loopsy pattern',
    category: 'Basics',
    minutes: 3,
    summary: 'Stitch counts, round labels, and the “Verified math” badge — what every number means.',
    sections: [
      {
        heading: 'The number in parentheses is your stitch count',
        body: 'Every worked round or row ends with a count like “(24 stitches)”. That is how many stitches you should have after finishing that line. If your count matches, you are on track; if it does not, recount before moving on — a missed increase compounds quickly.',
      },
      {
        heading: 'Round vs. row',
        body: '“Round 4” means you are working in a spiral or joined circle (amigurumi, hats, medallions). “Row 4” means you turn your work and go back the other way (scarves, flat panels). Loopsy labels every line so you always know which one you are on, and merges long unchanging stretches into ranges like “Rounds 6–10”.',
      },
      {
        heading: 'Why “Verified math”',
        body: 'Loopsy computes every stitch count from real geometry and then independently re-derives it with a separate checker. When both agree, the pattern earns the “Verified math ✓” badge — the counts are arithmetic, never guessed. If you ever spot a mismatch, it is worth reporting, because the engine treats that as a bug.',
      },
    ],
    related: ['working-in-the-round', 'increasing-and-decreasing'],
    stitches: ['st', 'rnd', 'row'],
  },
  {
    slug: 'magic-ring',
    title: 'The magic ring',
    category: 'Foundations',
    minutes: 4,
    summary: 'Start amigurumi and hats with an adjustable loop that closes the centre hole completely.',
    sections: [
      {
        heading: 'What it is',
        body: 'A magic ring (or magic circle) is an adjustable loop you work your first round into, then cinch shut. Unlike starting from a chain ring, it leaves no gap in the middle — essential for stuffed toys where stuffing would otherwise peek through.',
      },
      {
        heading: 'Making one',
        body: 'Wrap the yarn around two fingers to cross the working yarn over the tail, forming a loop. Insert your hook under the front strand, pull up a loop, and chain one to secure (this chain does not count as a stitch). Now work the required number of stitches — usually 6 single crochet — into the ring, working over both the loop and the tail.',
      },
      {
        heading: 'Closing it',
        body: 'Once all stitches are made, pull the tail firmly. The ring draws closed like a drawstring. Give it a gentle tug to make sure it is fully shut, then continue into the next round. A dab of weaving the tail through the closed stitches keeps it from loosening later.',
      },
    ],
    related: ['working-in-the-round', 'stuffing-and-assembly'],
    stitches: ['magic ring', 'sc'],
  },
  {
    slug: 'working-in-the-round',
    title: 'Working in continuous rounds',
    category: 'Foundations',
    minutes: 4,
    summary: 'Spiral rounds, the stitch marker that saves you, and why amigurumi rarely joins.',
    sections: [
      {
        heading: 'Spiral, not stacked',
        body: 'Most amigurumi is worked in a continuous spiral: you never join or turn, you just keep going round and round. This avoids a visible seam line, but it means the start of each round drifts — which is exactly why you need a marker.',
      },
      {
        heading: 'Use a stitch marker',
        body: 'Drop a removable marker (or a scrap of contrasting yarn) into the first stitch of a round. Each time you come back around to it, move it up to the new first stitch. This is the single most reliable way to keep your count honest over many rounds.',
      },
      {
        heading: 'Counting as you go',
        body: 'Pair the marker with the parenthesised stitch count at the end of each round. If you reach your marker and the count is off by one or two, the error is in the round you just finished — much easier to fix now than ten rounds later.',
      },
    ],
    related: ['magic-ring', 'increasing-and-decreasing'],
    stitches: ['rnd', 'sc'],
  },
  {
    slug: 'increasing-and-decreasing',
    title: 'Increasing & decreasing',
    category: 'Shaping',
    minutes: 5,
    summary: 'How shaping works, why increases are spaced evenly, and what “2 sc in next stitch” means.',
    sections: [
      {
        heading: 'Increases add a stitch',
        body: 'An increase is simply two stitches worked into the same stitch below — written as “2 sc in next stitch”. Each increase adds one to your count. A round that goes from 18 to 24 contains six increases.',
      },
      {
        heading: 'Even spacing keeps the curve smooth',
        body: 'Loopsy distributes increases as evenly as the maths allows, e.g. “[sc in next 2, 2 sc in next] repeat 6 times”. Even spacing makes a sphere round instead of lumpy. The engine works out the exact spacing for any stitch count — you just follow the bracketed repeat.',
      },
      {
        heading: 'Decreases remove a stitch',
        body: 'A decrease merges two stitches into one (sc2tog, or the invisible decrease). Decreases shape the top of a head or the end of a limb. They are spaced the same even way, so the piece narrows smoothly rather than puckering on one side.',
      },
    ],
    related: ['invisible-decrease', 'working-in-the-round'],
    stitches: ['inc', 'dec', 'sc2tog'],
  },
  {
    slug: 'invisible-decrease',
    title: 'The invisible decrease',
    category: 'Shaping',
    minutes: 3,
    summary: 'A neater decrease for amigurumi that hides the merged stitch almost completely.',
    sections: [
      {
        heading: 'Why “invisible”',
        body: 'A standard sc2tog can leave a small bump. The invisible decrease works through only the front loops of the next two stitches, which tucks the join to the back of the fabric — much cleaner on the face of a stuffed toy.',
      },
      {
        heading: 'How to work it',
        body: 'Insert your hook into the front loop only of the next stitch, then immediately into the front loop only of the following stitch (three loops on the hook is a common variation; for the classic invisible dec you have two front loops plus your working loop). Yarn over and pull through the two front loops, yarn over and pull through the remaining two loops. Two stitches become one, with the bump hidden behind.',
      },
    ],
    related: ['increasing-and-decreasing', 'stuffing-and-assembly'],
    stitches: ['dec', 'sc2tog', 'FLO'],
  },
  {
    slug: 'changing-colors-and-stripes',
    title: 'Changing colours & stripes',
    category: 'Colour',
    minutes: 4,
    summary: 'Clean colour changes and how Loopsy’s stripe plans turn into “Change to … yarn” steps.',
    sections: [
      {
        heading: 'The clean-change trick',
        body: 'For a crisp colour change, switch on the last yarn-over of the previous stitch: work the stitch until two loops remain on the hook, then complete it with the new colour. The new colour is in place before the next stitch begins, so there is no half-and-half stitch at the boundary.',
      },
      {
        heading: 'Stripes in Loopsy',
        body: 'When you give a part a stripe plan in the Design Canvas (or ask for “a red and white striped scarf”), the engine cycles your colours every N rounds and writes a “Change to … yarn” note exactly where the switch happens. The stitch counts never change — only which colour you are holding — so the pattern stays verified.',
      },
      {
        heading: 'Carrying vs. cutting',
        body: 'For narrow stripes you can carry the unused colour loosely up the inside of the work rather than cutting it each time. For wide bands, cut and weave in the ends. Either way, keep the carried strand relaxed so the fabric does not pucker.',
      },
    ],
    related: ['how-to-read-a-loopsy-pattern', 'stuffing-and-assembly'],
    stitches: ['sc', 'rnd'],
  },
  {
    slug: 'stuffing-and-assembly',
    title: 'Stuffing & assembly',
    category: 'Finishing',
    minutes: 4,
    summary: 'Stuff firmly, sew parts where the pattern says, and make joins disappear.',
    sections: [
      {
        heading: 'Stuff as you close, and stuff firmly',
        body: 'Add stuffing before the opening gets too small to reach into — usually a few rounds before the final decreases. Use small pieces and pack firmly but without stretching the stitches so the fibre shows through. A firmly stuffed piece holds its shape; an under-stuffed one slumps.',
      },
      {
        heading: 'Follow the assembly steps',
        body: 'Loopsy reads the positions you placed parts in on the canvas and writes the assembly steps from that geometry — “sew the ear to the upper left of the head, about 1 cm from centre”. Pin parts first, check symmetry from the front, then sew. You can edit those steps in the canvas if you want to word them your own way.',
      },
      {
        heading: 'Invisible seams & weaving in',
        body: 'Use a tapestry needle and the long tail you left. Catch one loop from each side alternately to draw the seam closed without a visible ridge. Finish by weaving the tail back through several stitches in two directions so it cannot work loose, then trim.',
      },
    ],
    related: ['magic-ring', 'increasing-and-decreasing'],
    stitches: ['sl st'],
  },
];

// The guided path: sequences existing beginner templates into lessons, each
// tied to the guide that teaches its new skill. templateId values match the
// seeded catalog (see Home's beginner path).
export const LEARN_PATH = [
  { step: 1, templateId: 'template_001', title: 'Your first chains & rows', skill: 'Chain stitches + single crochet rows', guide: 'how-to-read-a-loopsy-pattern' },
  { step: 2, templateId: 'template_015', title: 'Into the round', skill: 'Magic ring + continuous rounds', guide: 'magic-ring' },
  { step: 3, templateId: 'template_006', title: 'Rows & seaming', skill: 'Building panels and joining them', guide: 'stuffing-and-assembly' },
  { step: 4, templateId: 'template_005', title: 'Repetition & rhythm', skill: 'Confidence through repeats', guide: 'working-in-the-round' },
  { step: 5, templateId: 'template_008', title: 'First shaping', skill: 'Increases and decreases', guide: 'increasing-and-decreasing' },
  { step: 6, templateId: 'template_004', title: 'Working a rounded form', skill: 'Shaping in the round', guide: 'invisible-decrease' },
];

const GUIDE_BY_SLUG = Object.fromEntries(GUIDES.map((g) => [g.slug, g]));

export function getGuide(slug) {
  return GUIDE_BY_SLUG[slug] || null;
}

// Lightweight client-side search over the guides (title, summary, section text).
// The glossary is searched separately by the page using crochetAbbreviations.
export function searchGuides(query) {
  const q = String(query || '').trim().toLowerCase();
  if (q.length < 2) return [];
  return GUIDES.filter((g) => {
    const hay = [g.title, g.summary, g.category, ...g.sections.flatMap((s) => [s.heading, s.body])]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

export const GUIDE_CATEGORIES = [...new Set(GUIDES.map((g) => g.category))];
