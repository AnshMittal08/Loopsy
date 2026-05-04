const CATEGORY_THEMES = {
  wearable: {
    accent: 'from-amber-300 via-yellow-200 to-orange-100',
    panel: 'bg-amber-50',
    orb: 'bg-amber-300/60',
    icon: 'checkroom'
  },
  accessory: {
    accent: 'from-blue-300 via-sky-200 to-cyan-100',
    panel: 'bg-blue-50',
    orb: 'bg-blue-300/60',
    icon: 'shopping_bag'
  },
  amigurumi: {
    accent: 'from-pink-300 via-rose-200 to-fuchsia-100',
    panel: 'bg-pink-50',
    orb: 'bg-pink-300/60',
    icon: 'toys'
  },
  blanket: {
    accent: 'from-sky-300 via-blue-200 to-indigo-100',
    panel: 'bg-sky-50',
    orb: 'bg-sky-300/60',
    icon: 'bed'
  },
  home: {
    accent: 'from-teal-300 via-cyan-200 to-sky-100',
    panel: 'bg-teal-50',
    orb: 'bg-teal-300/60',
    icon: 'home'
  },
  practice: {
    accent: 'from-violet-300 via-purple-200 to-blue-100',
    panel: 'bg-violet-50',
    orb: 'bg-violet-300/60',
    icon: 'school'
  },
  custom: {
    accent: 'from-blue-200 via-sky-100 to-indigo-50',
    panel: 'bg-blue-50',
    orb: 'bg-blue-200/60',
    icon: 'auto_awesome'
  }
};

export function getPatternTheme(category) {
  return CATEGORY_THEMES[category?.toLowerCase()] ?? CATEGORY_THEMES.custom;
}
