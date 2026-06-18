import React, { useRef } from 'react';
import { Plus } from 'lucide-react';
import { PALETTE, hexOf } from '../lib/yarnColors';

// Yarn swatches + a native colour picker for unlimited custom colours, plus a
// row of recently-used custom colours. `value` is a palette name or a hex
// string; `onChange` receives whichever was chosen.
export default function ColorPicker({ value, onChange, recents = [], onAddRecent, size = 28, columns }) {
  const inputRef = useRef(null);
  const isActive = (c) => String(value).toLowerCase() === String(c).toLowerCase();
  const sw = { width: size, height: size };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5" style={columns ? { display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` } : undefined}>
        {PALETTE.map((p) => (
          <button key={p.name} onClick={() => onChange(p.name)} aria-label={p.name} title={p.name}
            className={`rounded-full border-2 transition-transform hover:scale-110 ${isActive(p.name) ? 'border-on-surface' : 'border-transparent'}`}
            style={{ ...sw, backgroundColor: p.hex }} />
        ))}
        {recents.map((hex) => (
          <button key={hex} onClick={() => onChange(hex)} aria-label={`custom ${hex}`} title={hex}
            className={`rounded-full border-2 transition-transform hover:scale-110 ${isActive(hex) ? 'border-on-surface' : 'border-transparent'}`}
            style={{ ...sw, backgroundColor: hex }} />
        ))}
        {/* custom colour picker */}
        <button onClick={() => inputRef.current?.click()} aria-label="Custom colour" title="Pick any colour"
          className="flex items-center justify-center rounded-full border-2 border-dashed border-outline-variant/50 text-on-surface-variant hover:border-primary/60 hover:text-primary transition-colors"
          style={sw}>
          <Plus size={size * 0.5} />
        </button>
        <input
          ref={inputRef} type="color"
          value={/^#([0-9a-f]{6})$/i.test(String(value)) ? value : hexOf(value)}
          onChange={(e) => { onChange(e.target.value); onAddRecent?.(e.target.value); }}
          className="sr-only" tabIndex={-1} aria-hidden
        />
      </div>
    </div>
  );
}
