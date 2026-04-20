const CATEGORY_THEMES = {
  wearable: {
    accent: 'from-amber-300 via-orange-200 to-rose-100',
    panel: 'bg-amber-50',
    orb: 'bg-orange-200/70',
    icon: 'checkroom'
  },
  accessory: {
    accent: 'from-emerald-300 via-teal-200 to-cyan-100',
    panel: 'bg-emerald-50',
    orb: 'bg-teal-200/70',
    icon: 'shopping_bag'
  },
  amigurumi: {
    accent: 'from-pink-300 via-rose-200 to-orange-100',
    panel: 'bg-rose-50',
    orb: 'bg-pink-200/70',
    icon: 'toys'
  },
  blanket: {
    accent: 'from-sky-300 via-indigo-200 to-violet-100',
    panel: 'bg-sky-50',
    orb: 'bg-indigo-200/70',
    icon: 'bed'
  },
  home: {
    accent: 'from-lime-300 via-emerald-200 to-stone-100',
    panel: 'bg-lime-50',
    orb: 'bg-lime-200/70',
    icon: 'home'
  },
  practice: {
    accent: 'from-violet-300 via-fuchsia-200 to-rose-100',
    panel: 'bg-violet-50',
    orb: 'bg-fuchsia-200/70',
    icon: 'school'
  },
  custom: {
    accent: 'from-slate-300 via-zinc-200 to-stone-100',
    panel: 'bg-slate-50',
    orb: 'bg-slate-300/70',
    icon: 'auto_awesome'
  }
};

export function getPatternTheme(category) {
  return CATEGORY_THEMES[category?.toLowerCase()] ?? CATEGORY_THEMES.custom;
}
