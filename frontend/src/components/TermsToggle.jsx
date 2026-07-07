import React from 'react';

/**
 * US / UK crochet-terminology switch. Purely presentational — the page owns
 * the mode (seeded from readTermsPref) and re-renders instructions through
 * renderTerms(). Patterns stay authored + verified in US terms.
 */
export default function TermsToggle({ mode, onChange }) {
  return (
    <div className="inline-flex items-center rounded-full border border-outline-variant/30 bg-surface-container-lowest p-0.5 text-[11px] font-semibold" role="group" aria-label="Crochet terminology">
      {['us', 'uk'].map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          aria-pressed={mode === m}
          className={`rounded-full px-2.5 py-1 uppercase transition-colors ${
            mode === m ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {m} terms
        </button>
      ))}
    </div>
  );
}
