import { Shirt, ShoppingBag, Rabbit, BedDouble, Home, GraduationCap, Sparkles } from 'lucide-react';

// Category themes in the Atelier yarn palette.
// `icon` is a lucide component — render as <theme.icon size={16} />.
const CATEGORY_THEMES = {
  wearable: {
    accent: 'from-yarn-marigold/85 to-yarn-coral/60',
    orb: 'bg-yarn-marigold/60',
    chip: 'bg-yarn-marigold/15 text-yarn-marigold',
    icon: Shirt,
  },
  accessory: {
    accent: 'from-yarn-periwinkle/85 to-yarn-sage/50',
    orb: 'bg-yarn-periwinkle/60',
    chip: 'bg-yarn-periwinkle/15 text-yarn-periwinkle',
    icon: ShoppingBag,
  },
  amigurumi: {
    accent: 'from-yarn-rose/85 to-yarn-periwinkle/55',
    orb: 'bg-yarn-rose/60',
    chip: 'bg-yarn-rose/15 text-yarn-rose',
    icon: Rabbit,
  },
  blanket: {
    accent: 'from-yarn-periwinkle/80 to-yarn-rose/50',
    orb: 'bg-yarn-periwinkle/60',
    chip: 'bg-yarn-periwinkle/15 text-yarn-periwinkle',
    icon: BedDouble,
  },
  home: {
    accent: 'from-yarn-sage/85 to-yarn-marigold/55',
    orb: 'bg-yarn-sage/60',
    chip: 'bg-yarn-sage/15 text-yarn-sage',
    icon: Home,
  },
  practice: {
    accent: 'from-yarn-coral/80 to-yarn-marigold/60',
    orb: 'bg-yarn-coral/60',
    chip: 'bg-yarn-coral/15 text-yarn-coral',
    icon: GraduationCap,
  },
  custom: {
    accent: 'from-yarn-coral/70 to-yarn-periwinkle/50',
    orb: 'bg-yarn-coral/60',
    chip: 'bg-yarn-coral/15 text-yarn-coral',
    icon: Sparkles,
  },
};

export function getPatternTheme(category) {
  return CATEGORY_THEMES[category?.toLowerCase()] ?? CATEGORY_THEMES.custom;
}
