// Engine-generated catalog templates.
//
// Each recipe is a parametric Design Spec + light metadata. We compile every
// recipe through lib/engine (which computes exact stitch counts in the canonical
// format the validator understands) and keep only those that re-derive with ZERO
// arithmetic errors. So every generated template is verified by construction —
// the same "computed, never guessed" guarantee the hand-authored seed makes.
//
// defaultPattern is the compiled instruction strings; hook size, finished size,
// and materials come straight from the compiler. Images are intentionally null —
// the catalog card falls back to a themed gradient when there's no imageUrl.

const { compileDesignSpec, validatePattern } = require('../engine');

// Compact spec helper.
const spec = (category, yarnWeight, parts, extra = {}) => ({ category, yarnWeight, parts, ...extra });
const part = (name, shape, dimensions, opts = {}) => ({ name, shape, dimensions, ...opts });

// ── Recipes ────────────────────────────────────────────────────────────────
// id, name, description, difficulty, category, tags, yarnWeight, timeEstimate,
// spec (the Design Spec parts/assembly/embellishments). Kept diverse across
// shapes, categories, and difficulty so the catalog reads like a real library.
const RECIPES = [
  // ----- Amigurumi · Beginner -----
  { id: 'template_101', name: 'Bouncy Juggling Ball', description: 'A firm little stuffed ball worked in a seamless spiral — the perfect first amigurumi for nailing the magic ring and even increases.', difficulty: 'Beginner', category: 'Amigurumi', tags: ['starter', 'quick', 'toy'], yarnWeight: 'DK', timeEstimate: '1–2 hrs',
    spec: spec('Amigurumi', 'DK', [part('Ball', 'sphere', { diameterCm: 7 }, { color: 'coral' })]) },
  { id: 'template_102', name: 'Speckled Easter Egg', description: 'A smooth egg shape that teaches gentle increases and decreases. Make a basketful in pastel scraps.', difficulty: 'Beginner', category: 'Amigurumi', tags: ['seasonal', 'quick', 'set'], yarnWeight: 'DK', timeEstimate: '1–2 hrs',
    spec: spec('Amigurumi', 'DK', [part('Egg', 'ellipsoid', { diameterCm: 5, heightCm: 7 }, { color: 'cream' })]) },
  { id: 'template_103', name: 'Tiny Toadstool', description: 'A storybook mushroom — a domed cap on a little stalk. A two-piece project that introduces simple assembly.', difficulty: 'Beginner', category: 'Amigurumi', tags: ['woodland', 'cute', 'decor'], yarnWeight: 'DK', timeEstimate: '2–3 hrs',
    spec: spec('Amigurumi', 'DK', [part('Cap', 'hemisphere', { diameterCm: 7 }, { color: 'rust' }), part('Stem', 'tube', { diameterCm: 3.5, heightCm: 5 }, { color: 'cream' })], { assembly: ['Stuff the cap and stem, then sew the cap centred on top of the stem.'], embellishments: ['Embroider small cream dots across the cap.'] }) },
  { id: 'template_104', name: 'Garden Carrot', description: 'A tapered carrot worked from the tip down. Great practice for cone shaping; add a leafy top in green.', difficulty: 'Beginner', category: 'Amigurumi', tags: ['food', 'garden', 'quick'], yarnWeight: 'DK', timeEstimate: '1–2 hrs',
    spec: spec('Amigurumi', 'DK', [part('Carrot', 'cone', { baseDiameterCm: 4.5, heightCm: 10 }, { color: 'marigold' })], { embellishments: ['Add a few loops of green yarn at the wide end for leaves.'] }) },
  { id: 'template_105', name: 'Little Plum', description: 'A round fruit with a soft sheen — a one-piece sphere in deep violet. Fast, satisfying, endlessly giftable.', difficulty: 'Beginner', category: 'Amigurumi', tags: ['food', 'quick', 'starter'], yarnWeight: 'DK', timeEstimate: '1–2 hrs',
    spec: spec('Amigurumi', 'DK', [part('Plum', 'sphere', { diameterCm: 6 }, { color: 'violet' })]) },
  { id: 'template_106', name: 'Acorn Trinket', description: 'A plump nut with a textured cap. Two simple pieces that come together into an autumn favourite.', difficulty: 'Beginner', category: 'Amigurumi', tags: ['woodland', 'seasonal', 'set'], yarnWeight: 'DK', timeEstimate: '2 hrs',
    spec: spec('Amigurumi', 'DK', [part('Nut', 'sphere', { diameterCm: 5 }, { color: 'cream' }), part('Cap', 'hemisphere', { diameterCm: 5.5 }, { color: 'chocolate' })], { assembly: ['Stuff the nut, then sew the cap over its top like a hat.'] }) },

  // ----- Amigurumi · Intermediate -----
  { id: 'template_107', name: 'Pocket Bear', description: 'A classic sit-up bear: round head, plump body, four little limbs and a pair of ears. The full amigurumi vocabulary in one friendly project.', difficulty: 'Intermediate', category: 'Amigurumi', tags: ['animal', 'gift', 'classic'], yarnWeight: 'DK', timeEstimate: '4–6 hrs',
    spec: spec('Amigurumi', 'DK', [
      part('Head', 'sphere', { diameterCm: 7 }, { color: 'chocolate', face: true }),
      part('Body', 'ellipsoid', { diameterCm: 7, heightCm: 9 }, { color: 'chocolate' }),
      part('Ear', 'sphere', { diameterCm: 3 }, { color: 'chocolate', quantity: 2 }),
      part('Arm', 'tube', { diameterCm: 2.5, heightCm: 5 }, { color: 'chocolate', quantity: 2 }),
      part('Leg', 'tube', { diameterCm: 3, heightCm: 5 }, { color: 'chocolate', quantity: 2 }),
    ], { assembly: ['Sew the head to the top of the body.', 'Attach the two ears to the top of the head.', 'Sew the arms to the sides and the legs to the base.'], embellishments: ['Embroider a nose and smile in black.'] }) },
  { id: 'template_108', name: 'Cuddly Bunny', description: 'A long-eared bunny with a round head and egg-shaped body. Soft, sweet, and a joy to gift.', difficulty: 'Intermediate', category: 'Amigurumi', tags: ['animal', 'baby', 'gift'], yarnWeight: 'DK', timeEstimate: '4–6 hrs',
    spec: spec('Amigurumi', 'DK', [
      part('Head', 'sphere', { diameterCm: 6.5 }, { color: 'cream', face: true }),
      part('Body', 'ellipsoid', { diameterCm: 6.5, heightCm: 8 }, { color: 'cream' }),
      part('Ear', 'ellipsoid', { diameterCm: 2.5, heightCm: 7 }, { color: 'cream', quantity: 2 }),
      part('Leg', 'tube', { diameterCm: 3, heightCm: 4 }, { color: 'cream', quantity: 2 }),
    ], { assembly: ['Sew the head onto the body.', 'Pin and attach the two long ears at the top of the head.', 'Sew the legs to the base of the body.'], embellishments: ['Add a small pom-pom tail and embroider a pink nose.'] }) },
  { id: 'template_109', name: 'Spring Chick', description: 'A round yellow chick with a tiny orange beak — a two-colour charmer that practises adding small details.', difficulty: 'Intermediate', category: 'Amigurumi', tags: ['animal', 'seasonal', 'cute'], yarnWeight: 'DK', timeEstimate: '3–4 hrs',
    spec: spec('Amigurumi', 'DK', [
      part('Body', 'sphere', { diameterCm: 7 }, { color: 'yellow', face: true }),
      part('Beak', 'cone', { baseDiameterCm: 2, heightCm: 2 }, { color: 'marigold' }),
      part('Wing', 'flatPanel', { widthCm: 3, heightCm: 4 }, { color: 'yellow', quantity: 2 }),
    ], { assembly: ['Sew the beak to the centre front of the body.', 'Attach a wing to each side.'] }) },
  { id: 'template_110', name: 'Sleepy Cat', description: 'A loaf-shaped cat with pointed ears and a curling tail. Combines spheres, cones and a tube into a beloved companion.', difficulty: 'Intermediate', category: 'Amigurumi', tags: ['animal', 'cat', 'gift'], yarnWeight: 'DK', timeEstimate: '4–5 hrs',
    spec: spec('Amigurumi', 'DK', [
      part('Head', 'sphere', { diameterCm: 6.5 }, { color: 'grey', face: true }),
      part('Body', 'ellipsoid', { diameterCm: 7, heightCm: 8 }, { color: 'grey' }),
      part('Ear', 'cone', { baseDiameterCm: 2.5, heightCm: 2.5 }, { color: 'grey', quantity: 2 }),
      part('Tail', 'tube', { diameterCm: 2, heightCm: 8 }, { color: 'grey' }),
    ], { assembly: ['Sew the head to the body.', 'Attach the two pointed ears to the top of the head.', 'Sew the tail to the back of the body and curl it round.'], embellishments: ['Embroider whiskers and a small pink nose.'] }) },
  { id: 'template_111', name: 'Busy Bee', description: 'A striped little bee with flat wings — your first colour-cycling project. The engine writes the colour changes for you.', difficulty: 'Intermediate', category: 'Amigurumi', tags: ['animal', 'stripes', 'colourwork'], yarnWeight: 'DK', timeEstimate: '3–4 hrs',
    spec: spec('Amigurumi', 'DK', [
      part('Body', 'ellipsoid', { diameterCm: 6, heightCm: 8 }, { face: true, colorPlan: { colors: ['yellow', 'charcoal'], stripeRounds: 2 } }),
      part('Wing', 'flatPanel', { widthCm: 3.5, heightCm: 4.5 }, { color: 'white', quantity: 2 }),
    ], { assembly: ['Sew both wings to the upper back of the body.'] }) },
  { id: 'template_112', name: 'Round Owl', description: 'A wide-eyed owl built from an egg-shaped body and little wings. A gentle introduction to character faces.', difficulty: 'Intermediate', category: 'Amigurumi', tags: ['animal', 'woodland', 'cute'], yarnWeight: 'DK', timeEstimate: '3–4 hrs',
    spec: spec('Amigurumi', 'DK', [
      part('Body', 'ellipsoid', { diameterCm: 7, heightCm: 9 }, { color: 'rust', face: true }),
      part('Wing', 'flatPanel', { widthCm: 3, heightCm: 5 }, { color: 'chocolate', quantity: 2 }),
      part('Beak', 'cone', { baseDiameterCm: 1.5, heightCm: 1.5 }, { color: 'marigold' }),
    ], { assembly: ['Sew the beak between the eyes.', 'Attach a wing to each side of the body.'] }) },

  // ----- Wearable -----
  { id: 'template_113', name: 'Newborn Beanie', description: 'A snug worked-in-the-round beanie sized for a newborn. The joined double-crochet crown grows by a predictable rhythm.', difficulty: 'Beginner', category: 'Wearable', tags: ['baby', 'hat', 'gift'], yarnWeight: 'Worsted', timeEstimate: '2–3 hrs',
    spec: spec('Wearable', 'Worsted', [part('Beanie', 'hatCrown', { size: 'baby' }, { color: 'rose' })]) },
  { id: 'template_114', name: "Kids' Beanie", description: 'A everyday beanie sized for children, worked from the crown down. A reliable, fast gift in any colour.', difficulty: 'Beginner', category: 'Wearable', tags: ['kids', 'hat', 'quick'], yarnWeight: 'Worsted', timeEstimate: '2–3 hrs',
    spec: spec('Wearable', 'Worsted', [part('Beanie', 'hatCrown', { size: 'child' }, { color: 'teal' })]) },
  { id: 'template_115', name: 'Classic Adult Beanie', description: 'The wardrobe staple — a smooth-crowned beanie sized for adults. Master this and you can size up or down at will.', difficulty: 'Intermediate', category: 'Wearable', tags: ['hat', 'staple', 'unisex'], yarnWeight: 'Worsted', timeEstimate: '3–4 hrs',
    spec: spec('Wearable', 'Worsted', [part('Beanie', 'hatCrown', { size: 'adult-m' }, { color: 'charcoal' })]) },
  { id: 'template_116', name: 'Striped Slouch Beanie', description: 'A relaxed adult slouch with bold two-round stripes. Colour cycling, computed and written into the pattern for you.', difficulty: 'Intermediate', category: 'Wearable', tags: ['hat', 'stripes', 'slouchy'], yarnWeight: 'Worsted', timeEstimate: '3–4 hrs',
    spec: spec('Wearable', 'Worsted', [part('Beanie', 'hatCrown', { size: 'adult-l' }, { colorPlan: { colors: ['mint', 'cream'], stripeRounds: 2 } })]) },
  { id: 'template_117', name: 'Cosy Infinity Cowl', description: 'A wide loop worked in the round — endless rounds of plain stitches that make a meditative, beginner-friendly wrap.', difficulty: 'Beginner', category: 'Wearable', tags: ['cowl', 'scarf', 'mindful'], yarnWeight: 'Bulky', timeEstimate: '3–5 hrs',
    spec: spec('Wearable', 'Bulky', [part('Cowl', 'tube', { diameterCm: 22, heightCm: 24 }, { color: 'periwinkle' })]) },
  { id: 'template_118', name: 'Ribbed Ear Warmer', description: 'A simple band that hugs the head and keeps ears toasty. A short, satisfying make with a clean seam.', difficulty: 'Beginner', category: 'Wearable', tags: ['headband', 'quick', 'winter'], yarnWeight: 'Worsted', timeEstimate: '1–2 hrs',
    spec: spec('Wearable', 'Worsted', [part('Band', 'flatPanel', { widthCm: 10, heightCm: 48 }, { color: 'rose' })], { assembly: ['Seam the two short ends together to form a loop.'] }) },
  { id: 'template_119', name: 'Wrist Warmers', description: 'A pair of plain tubes that slip over the wrists — warmth without covering the fingers. A quick, useful gift.', difficulty: 'Beginner', category: 'Wearable', tags: ['mitts', 'quick', 'pair'], yarnWeight: 'Worsted', timeEstimate: '2–3 hrs',
    spec: spec('Wearable', 'Worsted', [part('Warmer', 'tube', { diameterCm: 8, heightCm: 14 }, { color: 'violet', quantity: 2 })]) },

  // ----- Accessory -----
  { id: 'template_120', name: 'Classic Granny Square', description: 'The building block of countless projects — clusters and corner spaces growing round by round. Make one, or a hundred.', difficulty: 'Beginner', category: 'Accessory', tags: ['granny', 'classic', 'modular'], yarnWeight: 'Worsted', timeEstimate: '1 hr',
    spec: spec('Accessory', 'Worsted', [part('Square', 'grannySquare', { sideCm: 15 }, { color: 'marigold' })]) },
  { id: 'template_121', name: 'Sunburst Coaster', description: 'A small, sturdy granny worked tight to protect your tabletop. A one-sitting project to use up scraps.', difficulty: 'Beginner', category: 'Accessory', tags: ['coaster', 'quick', 'home'], yarnWeight: 'Worsted', timeEstimate: '30–45 min',
    spec: spec('Accessory', 'Worsted', [part('Coaster', 'grannySquare', { sideCm: 10 }, { color: 'teal' })]) },
  { id: 'template_122', name: 'Tassel Bookmark', description: 'A long, narrow band worked in rows — slim enough to mark your page, with a tassel at the tip.', difficulty: 'Beginner', category: 'Accessory', tags: ['bookmark', 'quick', 'gift'], yarnWeight: 'Worsted', timeEstimate: '45 min',
    spec: spec('Accessory', 'Worsted', [part('Bookmark', 'flatPanel', { widthCm: 4, heightCm: 18 }, { color: 'rose' })], { embellishments: ['Add a small tassel to one short end.'] }) },
  { id: 'template_123', name: 'Drawstring Pouch', description: 'A little worked-in-the-round bag for trinkets or treasures. Add a chain drawstring threaded through the top.', difficulty: 'Intermediate', category: 'Accessory', tags: ['pouch', 'bag', 'storage'], yarnWeight: 'Worsted', timeEstimate: '2–3 hrs',
    spec: spec('Accessory', 'Worsted', [part('Pouch', 'tube', { diameterCm: 9, heightCm: 11 }, { color: 'periwinkle' })], { embellishments: ['Thread a crocheted chain through the final round as a drawstring.'] }) },
  { id: 'template_124', name: 'Phone Cosy', description: 'A snug sleeve that keeps your phone scratch-free. A quick tube sized to your handset.', difficulty: 'Beginner', category: 'Accessory', tags: ['pouch', 'quick', 'tech'], yarnWeight: 'Worsted', timeEstimate: '1–2 hrs',
    spec: spec('Accessory', 'Worsted', [part('Cosy', 'tube', { diameterCm: 8, heightCm: 15 }, { color: 'mint' })]) },

  // ----- Home Decor -----
  { id: 'template_125', name: 'Little Storage Basket', description: 'A firm-sided basket worked in the round in bulky yarn — perfect for corralling odds and ends on a shelf.', difficulty: 'Intermediate', category: 'Home Decor', tags: ['basket', 'storage', 'home'], yarnWeight: 'Bulky', timeEstimate: '3–4 hrs',
    spec: spec('Home Decor', 'Bulky', [part('Basket', 'tube', { diameterCm: 14, heightCm: 10 }, { color: 'chocolate' })]) },
  { id: 'template_126', name: 'Big Floor Basket', description: 'A generous round basket for blankets or toys. Held double in bulky yarn it stands up on its own.', difficulty: 'Intermediate', category: 'Home Decor', tags: ['basket', 'storage', 'statement'], yarnWeight: 'Bulky', timeEstimate: '5–7 hrs',
    spec: spec('Home Decor', 'Bulky', [part('Basket', 'tube', { diameterCm: 26, heightCm: 22 }, { color: 'grey' })]) },
  { id: 'template_127', name: 'Trinket Bowl', description: 'A shallow domed bowl that holds rings, keys, or sweets. A hemisphere worked firmly so it keeps its shape.', difficulty: 'Beginner', category: 'Home Decor', tags: ['bowl', 'home', 'quick'], yarnWeight: 'Worsted', timeEstimate: '2 hrs',
    spec: spec('Home Decor', 'Worsted', [part('Bowl', 'hemisphere', { diameterCm: 14 }, { color: 'marigold' })]) },
  { id: 'template_128', name: 'Plant Pot Cosy', description: 'A snug round cover that dresses up a plain nursery pot. A simple tube sized to slip over the pot.', difficulty: 'Beginner', category: 'Home Decor', tags: ['plant', 'home', 'cover'], yarnWeight: 'Worsted', timeEstimate: '2–3 hrs',
    spec: spec('Home Decor', 'Worsted', [part('Cosy', 'tube', { diameterCm: 12, heightCm: 12 }, { color: 'mint' })]) },
  { id: 'template_129', name: 'Patchwork Pillow Front', description: 'An oversized granny square that becomes the face of a cushion. Back it with fabric or a second square.', difficulty: 'Intermediate', category: 'Home Decor', tags: ['pillow', 'granny', 'statement'], yarnWeight: 'Worsted', timeEstimate: '4–6 hrs',
    spec: spec('Home Decor', 'Worsted', [part('Panel', 'grannySquare', { sideCm: 40 }, { color: 'coral' })]) },
  { id: 'template_130', name: 'Heirloom Pumpkin', description: 'A softly ribbed pumpkin with a little stalk — a centrepiece for the autumn table. Cinch the body for its ridges.', difficulty: 'Intermediate', category: 'Home Decor', tags: ['seasonal', 'pumpkin', 'decor'], yarnWeight: 'Worsted', timeEstimate: '3–4 hrs',
    spec: spec('Home Decor', 'Worsted', [
      part('Body', 'ellipsoid', { diameterCm: 14, heightCm: 11 }, { color: 'marigold' }),
      part('Stalk', 'tube', { diameterCm: 3, heightCm: 5 }, { color: 'chocolate' }),
    ], { assembly: ['Stuff the body and sew the stalk to the centre top.'], embellishments: ['Wrap yarn vertically around the body and pull snug to form ribs.'] }) },
];

let _cache = null;

/**
 * Build the engine-generated templates: compile each recipe, keep only those
 * that re-derive with zero arithmetic errors, and shape them like seed rows.
 * Cached — recipes are static.
 */
function buildGeneratedTemplates() {
  if (_cache) return _cache;
  const out = [];
  // Fixed seed date so the generated Postgres migration is deterministic
  // (regenerating produces no diff). On conflict, createdAt is preserved anyway.
  const now = '2026-06-30T00:00:00.000Z';
  for (const r of RECIPES) {
    let compiled;
    try {
      compiled = compileDesignSpec(r.spec);
    } catch {
      continue;
    }
    if (!compiled || !compiled.ok || !Array.isArray(compiled.steps) || compiled.steps.length === 0) continue;

    const steps = compiled.steps.map((s) => ({ row: s.row, instruction: s.instruction }));
    // Safety net: never ship a generated template the validator flags.
    if (validatePattern(steps).issues.length !== 0) continue;

    out.push({
      id: r.id,
      name: r.name,
      description: r.description,
      difficulty: r.difficulty,
      category: r.category,
      tags: r.tags || [],
      imageUrl: null, // catalog card falls back to a themed gradient
      hookSize: compiled.hookSize || null,
      yarnWeight: r.yarnWeight || compiled.yarnWeight || null,
      timeEstimate: r.timeEstimate || null,
      finishedSize: compiled.finishedSize || null,
      materials: compiled.materials || [],
      notes: r.notes || [],
      defaultPattern: compiled.steps.map((s) => s.instruction),
      createdAt: now,
    });
  }
  _cache = out;
  return out;
}

module.exports = { buildGeneratedTemplates, RECIPES };
