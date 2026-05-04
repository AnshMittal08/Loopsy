import React, { useState } from 'react';

const PALETTES = [
  {
    id: 'tropical-punch',
    name: 'Tropical Punch',
    swatches: ['#FF8243', '#FFC0CB', '#FCE883', '#069494'],
    vars: {
      '--color-surface': '#FFF8F6',
      '--color-surface-bright': '#FFFFFF',
      '--color-surface-dim': '#F0DDD8',
      '--color-surface-container-lowest': '#FFFFFF',
      '--color-surface-container-low': '#FFF0EC',
      '--color-surface-container': '#FFE8E2',
      '--color-surface-container-high': '#FFDDD4',
      '--color-surface-container-highest': '#FFCFC4',
      '--color-surface-variant': '#FFE8E2',
      '--color-background': '#FFF8F6',
      '--color-on-surface': '#1A0F0A',
      '--color-on-surface-variant': '#6B3D2E',
      '--color-primary': '#FF8243',
      '--color-primary-dim': '#E86A2C',
      '--color-primary-fixed': '#FFE0D0',
      '--color-primary-fixed-dim': '#FFC0A0',
      '--color-on-primary': '#FFFFFF',
      '--color-primary-container': '#FFE0D0',
      '--color-on-primary-container': '#5A1A00',
      '--color-secondary': '#069494',
      '--color-secondary-dim': '#047A7A',
      '--color-secondary-container': '#D6F4F4',
      '--color-on-secondary': '#FFFFFF',
      '--color-on-secondary-container': '#003030',
      '--color-tertiary': '#D4A000',
      '--color-tertiary-container': '#FFF6CC',
      '--color-on-tertiary': '#FFFFFF',
      '--color-on-tertiary-container': '#3D2C00',
      '--color-outline': '#A06050',
      '--color-outline-variant': '#DFBDB0',
    }
  },
  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom',
    swatches: ['#D4506A', '#FFB7C5', '#D5F3D8', '#F2C7C7'],
    vars: {
      '--color-surface': '#FFF8F9',
      '--color-surface-bright': '#FFFFFF',
      '--color-surface-dim': '#F5E0E4',
      '--color-surface-container-lowest': '#FFFFFF',
      '--color-surface-container-low': '#FFF0F3',
      '--color-surface-container': '#FFE6EB',
      '--color-surface-container-high': '#FFDAE0',
      '--color-surface-container-highest': '#FFCDD5',
      '--color-surface-variant': '#FFE6EB',
      '--color-background': '#FFF8F9',
      '--color-on-surface': '#1A080E',
      '--color-on-surface-variant': '#6B2E3E',
      '--color-primary': '#D4506A',
      '--color-primary-dim': '#B03A56',
      '--color-primary-fixed': '#FFD6E0',
      '--color-primary-fixed-dim': '#FFB7C5',
      '--color-on-primary': '#FFFFFF',
      '--color-primary-container': '#FFD6E0',
      '--color-on-primary-container': '#4A0018',
      '--color-secondary': '#3D8B5A',
      '--color-secondary-dim': '#2E6E46',
      '--color-secondary-container': '#D5F3D8',
      '--color-on-secondary': '#FFFFFF',
      '--color-on-secondary-container': '#0D3320',
      '--color-tertiary': '#C84870',
      '--color-tertiary-container': '#FFE0EA',
      '--color-on-tertiary': '#FFFFFF',
      '--color-on-tertiary-container': '#4A001C',
      '--color-outline': '#9B5060',
      '--color-outline-variant': '#F2C7C7',
    }
  },
  {
    id: 'california-beaches',
    name: 'California Beaches',
    swatches: ['#C47800', '#FFC067', '#66C4FF', '#7D99AA'],
    vars: {
      '--color-surface': '#FFFCF5',
      '--color-surface-bright': '#FFFFFF',
      '--color-surface-dim': '#F0E8D0',
      '--color-surface-container-lowest': '#FFFFFF',
      '--color-surface-container-low': '#FFF8EC',
      '--color-surface-container': '#FFF0D8',
      '--color-surface-container-high': '#FFE8C4',
      '--color-surface-container-highest': '#FFDDB0',
      '--color-surface-variant': '#FFF0D8',
      '--color-background': '#FFFCF5',
      '--color-on-surface': '#1A1005',
      '--color-on-surface-variant': '#6B4A10',
      '--color-primary': '#C47800',
      '--color-primary-dim': '#A06200',
      '--color-primary-fixed': '#FFF0CC',
      '--color-primary-fixed-dim': '#FFE099',
      '--color-on-primary': '#FFFFFF',
      '--color-primary-container': '#FFF0CC',
      '--color-on-primary-container': '#3D2400',
      '--color-secondary': '#3A8CC4',
      '--color-secondary-dim': '#2A70A8',
      '--color-secondary-container': '#CCE8FF',
      '--color-on-secondary': '#FFFFFF',
      '--color-on-secondary-container': '#0A2848',
      '--color-tertiary': '#5090A8',
      '--color-tertiary-container': '#CCE8F8',
      '--color-on-tertiary': '#FFFFFF',
      '--color-on-tertiary-container': '#082838',
      '--color-outline': '#8A6820',
      '--color-outline-variant': '#DCC890',
    }
  },
  {
    id: 'frozen-lake',
    name: 'Frozen Lake',
    swatches: ['#1040A0', '#ADD8E6', '#6D8196', '#FFFAFA'],
    vars: {
      '--color-surface': '#F8FAFF',
      '--color-surface-bright': '#FFFFFF',
      '--color-surface-dim': '#D8E4F0',
      '--color-surface-container-lowest': '#FFFFFF',
      '--color-surface-container-low': '#EEF4FC',
      '--color-surface-container': '#E2EDF8',
      '--color-surface-container-high': '#D4E4F4',
      '--color-surface-container-highest': '#C4D8EE',
      '--color-surface-variant': '#E2EDF8',
      '--color-background': '#F8FAFF',
      '--color-on-surface': '#080F1E',
      '--color-on-surface-variant': '#2A4060',
      '--color-primary': '#1040A0',
      '--color-primary-dim': '#0A2D80',
      '--color-primary-fixed': '#C8D4F8',
      '--color-primary-fixed-dim': '#A0B4F0',
      '--color-on-primary': '#FFFFFF',
      '--color-primary-container': '#C8D4F8',
      '--color-on-primary-container': '#050E30',
      '--color-secondary': '#4E6878',
      '--color-secondary-dim': '#3A5060',
      '--color-secondary-container': '#C8DDE8',
      '--color-on-secondary': '#FFFFFF',
      '--color-on-secondary-container': '#0A2030',
      '--color-tertiary': '#4A90C0',
      '--color-tertiary-container': '#C8E4F4',
      '--color-on-tertiary': '#FFFFFF',
      '--color-on-tertiary-container': '#082030',
      '--color-outline': '#5A7890',
      '--color-outline-variant': '#98B4C8',
    }
  }
];

function applyPalette(vars) {
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
}

export default function PaletteSwitcher() {
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState('tropical-punch');

  function select(palette) {
    setActive(palette.id);
    applyPalette(palette.vars);
  }

  return (
    <div className="fixed bottom-6 left-6 z-[99999]">
      {open ? (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-2xl p-4 w-64">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Choose palette</p>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="space-y-2">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                onClick={() => select(p)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all border ${
                  active === p.id
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-transparent hover:bg-gray-50'
                }`}
              >
                <div className="flex gap-1 shrink-0">
                  {p.swatches.map((c) => (
                    <div key={c} className="h-5 w-5 rounded-full border border-white shadow-sm" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <span className="text-xs font-semibold text-gray-700">{p.name}</span>
                {active === p.id && (
                  <span className="material-symbols-outlined text-[16px] text-gray-900 ml-auto">check</span>
                )}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-gray-400 text-center">Preview only — tell me which one to keep</p>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-white border border-gray-200 shadow-xl px-4 py-2.5 flex items-center gap-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          <span className="material-symbols-outlined text-[16px]">palette</span>
          Palettes
        </button>
      )}
    </div>
  );
}
