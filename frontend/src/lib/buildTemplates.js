// Starter creatures for the Build canvas, so a maker isn't staring at two
// shapes wondering what to do. Each is a set of positioned parts (canvas
// coords, CANVAS.w 360 × CANVAS.h 460); visible pairs are separate parts so the
// preview reads as a real creature in both 2D and 3D.

const P = (name, shape, dims, color, x, y, extra = {}) => ({ name, shape, dims, color, quantity: 1, x, y, ...extra });

export const BUILD_TEMPLATES = [
  {
    id: 'teddy', label: 'Teddy',
    parts: () => [
      P('Body', 'ellipsoid', { diameterCm: 8, heightCm: 10 }, 'brown', 180, 300),
      P('Arm', 'tube', { diameterCm: 2.6, heightCm: 6 }, 'brown', 126, 288),
      P('Arm', 'tube', { diameterCm: 2.6, heightCm: 6 }, 'brown', 234, 288),
      P('Leg', 'tube', { diameterCm: 3, heightCm: 6 }, 'brown', 158, 398),
      P('Leg', 'tube', { diameterCm: 3, heightCm: 6 }, 'brown', 202, 398),
      P('Head', 'sphere', { diameterCm: 7 }, 'brown', 180, 150, { face: true }),
      P('Ear', 'sphere', { diameterCm: 3 }, 'brown', 150, 116),
      P('Ear', 'sphere', { diameterCm: 3 }, 'brown', 210, 116),
      P('Muzzle', 'sphere', { diameterCm: 3 }, 'cream', 180, 168),
    ],
  },
  {
    id: 'bunny', label: 'Bunny',
    parts: () => [
      P('Body', 'ellipsoid', { diameterCm: 7, heightCm: 9 }, 'white', 180, 300),
      P('Arm', 'tube', { diameterCm: 2.4, heightCm: 5 }, 'white', 132, 288),
      P('Arm', 'tube', { diameterCm: 2.4, heightCm: 5 }, 'white', 228, 288),
      P('Tail', 'sphere', { diameterCm: 2.5 }, 'white', 210, 352),
      P('Head', 'sphere', { diameterCm: 6.5 }, 'white', 180, 165, { face: true }),
      P('Ear', 'tube', { diameterCm: 2, heightCm: 7 }, 'white', 165, 108),
      P('Ear', 'tube', { diameterCm: 2, heightCm: 7 }, 'white', 195, 108),
      P('Muzzle', 'sphere', { diameterCm: 2.5 }, 'rose', 180, 180),
    ],
  },
  {
    id: 'cat', label: 'Cat',
    parts: () => [
      P('Body', 'ellipsoid', { diameterCm: 7, heightCm: 9 }, 'charcoal', 180, 300),
      P('Tail', 'tube', { diameterCm: 2, heightCm: 7 }, 'charcoal', 232, 330),
      P('Leg', 'tube', { diameterCm: 2.8, heightCm: 5 }, 'charcoal', 160, 392),
      P('Leg', 'tube', { diameterCm: 2.8, heightCm: 5 }, 'charcoal', 200, 392),
      P('Head', 'sphere', { diameterCm: 6.5 }, 'charcoal', 180, 160, { face: true }),
      P('Ear', 'cone', { baseDiameterCm: 3, heightCm: 3.5 }, 'charcoal', 156, 116),
      P('Ear', 'cone', { baseDiameterCm: 3, heightCm: 3.5 }, 'charcoal', 204, 116),
      P('Muzzle', 'sphere', { diameterCm: 2.5 }, 'cream', 180, 175),
    ],
  },
  {
    id: 'snowman', label: 'Snowman',
    parts: () => [
      P('Bottom', 'sphere', { diameterCm: 9 }, 'white', 180, 350),
      P('Middle', 'sphere', { diameterCm: 6.5 }, 'white', 180, 250),
      P('Arm', 'tube', { diameterCm: 1.4, heightCm: 6 }, 'brown', 130, 250),
      P('Arm', 'tube', { diameterCm: 1.4, heightCm: 6 }, 'brown', 230, 250),
      P('Head', 'sphere', { diameterCm: 5 }, 'white', 180, 165, { face: true }),
      P('Nose', 'cone', { baseDiameterCm: 1.4, heightCm: 3 }, 'orange', 196, 165),
    ],
  },
  {
    id: 'chick', label: 'Chick',
    parts: () => [
      P('Body', 'sphere', { diameterCm: 7 }, 'marigold', 180, 280),
      P('Wing', 'flatPanel', { widthCm: 2.5, heightCm: 4 }, 'marigold', 138, 285),
      P('Wing', 'flatPanel', { widthCm: 2.5, heightCm: 4 }, 'marigold', 222, 285),
      P('Foot', 'cone', { baseDiameterCm: 2, heightCm: 2 }, 'orange', 165, 330),
      P('Foot', 'cone', { baseDiameterCm: 2, heightCm: 2 }, 'orange', 195, 330),
      P('Head', 'sphere', { diameterCm: 5.5 }, 'marigold', 180, 175, { face: true }),
      P('Beak', 'cone', { baseDiameterCm: 1.6, heightCm: 2 }, 'orange', 180, 190),
    ],
  },
];
