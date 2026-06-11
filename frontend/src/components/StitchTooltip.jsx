import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink } from 'lucide-react';
import { ABBREVIATIONS, expandAbbreviations } from '../lib/crochetAbbreviations';

let closeCurrentTooltip = null;

function TooltipPortal({ triggerRef, children, onMouseEnter, onMouseLeave }) {
  const [pos, setPos] = useState({ top: 0, left: 0, above: true });

  useEffect(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const above = rect.top > 240;
    setPos({
      top: above ? rect.top - 8 : rect.bottom + 8,
      left: Math.min(Math.max(rect.left + rect.width / 2, 160), window.innerWidth - 160),
      above,
    });
  }, [triggerRef]);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: pos.above ? undefined : pos.top,
        bottom: pos.above ? window.innerHeight - pos.top : undefined,
        left: pos.left,
        transform: 'translateX(-50%)',
        zIndex: 9999,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>,
    document.body
  );
}

function StitchTooltip({ stitchData, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const hoverTimeout = useRef(null);

  const open = useCallback(() => {
    if (closeCurrentTooltip && closeCurrentTooltip !== setIsOpen) {
      closeCurrentTooltip(false);
    }
    closeCurrentTooltip = setIsOpen;
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    if (closeCurrentTooltip === setIsOpen) closeCurrentTooltip = null;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e) {
      if (triggerRef.current && !triggerRef.current.contains(e.target)) {
        const portal = document.querySelector('[data-stitch-tooltip]');
        if (portal && portal.contains(e.target)) return;
        close();
      }
    }
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isOpen, close]);

  return (
    <span className="inline">
      <button
        ref={triggerRef}
        type="button"
        className="inline text-left border-b border-dashed border-primary/40 text-inherit hover:text-primary hover:border-primary transition-colors cursor-help"
        onMouseEnter={() => {
          clearTimeout(hoverTimeout.current);
          hoverTimeout.current = setTimeout(open, 150);
        }}
        onMouseLeave={() => {
          clearTimeout(hoverTimeout.current);
          hoverTimeout.current = setTimeout(close, 300);
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          isOpen ? close() : open();
        }}
      >
        {children}
      </button>

      {isOpen && (
        <TooltipPortal
          triggerRef={triggerRef}
          onMouseEnter={() => clearTimeout(hoverTimeout.current)}
          onMouseLeave={() => { hoverTimeout.current = setTimeout(close, 300); }}
        >
          <div
            data-stitch-tooltip
            className="w-80 rounded-xl bg-surface-container-lowest shadow-lg border border-outline-variant/10 overflow-hidden"
          >
            <div className="p-4">
              <p className="text-sm font-bold text-primary capitalize">{stitchData.full}</p>
              <p className="mt-2 text-xs text-on-surface-variant leading-relaxed">{stitchData.explanation}</p>
            </div>

            {stitchData.videoUrl && (
              <a
                href={stitchData.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 bg-surface-container-low hover:bg-surface-container transition-colors group"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-white shadow-sm group-hover:scale-105 transition-transform">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-on-surface">Watch tutorial</p>
                  <p className="text-[11px] text-on-surface-variant truncate">{stitchData.videoLabel}</p>
                </div>
                <ExternalLink size={14} className="text-on-surface-variant/50 ml-auto shrink-0" />
              </a>
            )}

            <div className="px-4 py-2.5 border-t border-outline-variant/10 bg-surface-container-lowest">
              <span className="text-[11px] text-on-surface-variant/40 font-semibold cursor-default">
                Learn more coming soon →
              </span>
            </div>
          </div>
        </TooltipPortal>
      )}
    </span>
  );
}

export default function StitchStep({ instruction }) {
  if (!instruction) return null;

  const expanded = expandAbbreviations(instruction);

  const matches = [];
  for (const entry of ABBREVIATIONS) {
    if (!entry.explanation) continue;
    const escaped = entry.full.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![a-zA-Z])${escaped}(?![a-zA-Z])`, 'gi');
    let m;
    while ((m = regex.exec(expanded)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0].length, text: m[0], entry });
    }
  }

  matches.sort((a, b) => a.start - b.start);

  const filtered = [];
  let lastEnd = -1;
  for (const match of matches) {
    if (match.start >= lastEnd) {
      filtered.push(match);
      lastEnd = match.end;
    }
  }

  if (filtered.length === 0) {
    return <span>{expanded}</span>;
  }

  const segments = [];
  let cursor = 0;
  for (const match of filtered) {
    if (cursor < match.start) {
      segments.push(<span key={`t-${cursor}`}>{expanded.slice(cursor, match.start)}</span>);
    }
    segments.push(
      <StitchTooltip key={`s-${match.start}`} stitchData={match.entry}>
        {match.text}
      </StitchTooltip>
    );
    cursor = match.end;
  }
  if (cursor < expanded.length) {
    segments.push(<span key={`t-${cursor}`}>{expanded.slice(cursor)}</span>);
  }

  return <span>{segments}</span>;
}
