import React, { useRef, useCallback, useId } from 'react';
import { hexOf } from '../lib/yarnColors';
import { partGeometry, partBBox, profileY } from '../lib/shapeKit';
import { CANVAS } from '../lib/assembly';

// Interactive (or read-only) SVG stage where parts are placed and dragged.
// Coordinates live in a canonical canvas space (CANVAS.w × CANVAS.h, px/cm),
// so the editor and the share page render designs identically.
//
// Each part is drawn to look like plush yarn: a base color, a crochet stitch
// texture, a soft top-left sheen and a bottom-right shade for roundness, and a
// drop shadow so stacked parts read as attached.

// One geometry, any fill — lets us stack base/texture/sheen/shade copies.
function geom(g, key, extra) {
  if (g.type === 'circle') return <circle key={key} cx={g.cx} cy={g.cy} r={g.r} {...extra} />;
  if (g.type === 'ellipse') return <ellipse key={key} cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} {...extra} />;
  if (g.type === 'rect') return <rect key={key} x={g.x} y={g.y} width={g.width} height={g.height} rx={g.rx} {...extra} />;
  if (g.type === 'polygon') return <polygon key={key} points={g.points} {...extra} />;
  if (g.type === 'path') return <path key={key} d={g.d} {...extra} />;
  return null;
}

function Face({ part, px }) {
  const bb = partBBox(part, px);
  const cx = bb.x + bb.w / 2;
  const cy = bb.y + bb.h * 0.42;
  const r = Math.min(bb.w, bb.h);
  const eye = Math.max(2.2, r * 0.05);
  const dx = r * 0.18;
  return (
    <g>
      <circle cx={cx - dx} cy={cy} r={eye} fill="#1A1726" />
      <circle cx={cx + dx} cy={cy} r={eye} fill="#1A1726" />
      <circle cx={cx - dx + eye * 0.3} cy={cy - eye * 0.3} r={eye * 0.32} fill="#fff" />
      <circle cx={cx + dx + eye * 0.3} cy={cy - eye * 0.3} r={eye * 0.32} fill="#fff" />
      <circle cx={cx - dx * 2.1} cy={cy + eye * 1.4} r={eye * 0.7} fill="#FF6584" opacity="0.45" />
      <circle cx={cx + dx * 2.1} cy={cy + eye * 1.4} r={eye * 0.7} fill="#FF6584" opacity="0.45" />
    </g>
  );
}

function SculptHandles({ part, onSculptDown }) {
  const d = part.dims || {};
  const prof = [...(d.profile || [])].sort((a, b) => a.t - b.t);
  const H = (d.heightCm || 8) * CANVAS.px;
  return (
    <g>
      {/* centerline */}
      <line x1={part.x} y1={part.y - H / 2} x2={part.x} y2={part.y + H / 2} stroke="var(--primary)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
      {prof.map((p, i) => {
        const hx = part.x + p.r * CANVAS.px;
        const hy = profileY(p.t, part.y, H);
        return (
          <g key={i}>
            <line x1={part.x} y1={hy} x2={hx} y2={hy} stroke="var(--primary)" strokeWidth="1" opacity="0.4" />
            <circle cx={hx} cy={hy} r="6" fill="var(--primary)" stroke="#fff" strokeWidth="2"
              style={{ cursor: 'ew-resize' }} onPointerDown={(e) => onSculptDown(e, part, i)} />
          </g>
        );
      })}
    </g>
  );
}

function Part({ part, selected, ids, onPointerDown, onSculptDown }) {
  const g = partGeometry(part, CANVAS.px);
  const fill = hexOf(part.color);
  const handlers = onPointerDown ? { onPointerDown: (e) => onPointerDown(e, part), style: { cursor: 'grab' } } : {};
  const isSculpt = part.shape === 'revolve';
  return (
    <g>
      <g {...handlers}>
        <g filter={`url(#${ids.shadow})`}>
          {geom(g, 'base', { fill })}
          {geom(g, 'tex', { fill: `url(#${ids.stitch})` })}
          {geom(g, 'sheen', { fill: `url(#${ids.sheen})` })}
          {geom(g, 'shade', { fill: `url(#${ids.shade})` })}
        </g>
        {part.face && <Face part={part} px={CANVAS.px} />}
      </g>
      {selected && !isSculpt && (() => {
        const bb = partBBox(part, CANVAS.px);
        const pad = 6;
        return (
          <rect x={bb.x - pad} y={bb.y - pad} width={bb.w + pad * 2} height={bb.h + pad * 2} rx={8}
            fill="none" stroke="var(--primary)" strokeWidth="1.6" strokeDasharray="5 4" />
        );
      })()}
      {selected && isSculpt && onSculptDown && <SculptHandles part={part} onSculptDown={onSculptDown} />}
    </g>
  );
}

export default function CanvasStage({ parts, selectedId, onSelect, onMove, onSculpt, interactive = true, className = '' }) {
  const svgRef = useRef(null);
  const uid = useId().replace(/:/g, '');
  const ids = {
    grid: `grid-${uid}`, stitch: `stitch-${uid}`, sheen: `sheen-${uid}`,
    shade: `shade-${uid}`, shadow: `shadow-${uid}`,
  };

  const toCanvas = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }, []);

  const handleDown = useCallback((e, part) => {
    if (!interactive) return;
    e.stopPropagation();
    onSelect?.(part.id);
    const start = toCanvas(e.clientX, e.clientY);
    const dx = start.x - part.x;
    const dy = start.y - part.y;
    const move = (ev) => {
      const pt = toCanvas(ev.clientX, ev.clientY);
      const x = Math.max(10, Math.min(CANVAS.w - 10, pt.x - dx));
      const y = Math.max(10, Math.min(CANVAS.h - 10, pt.y - dy));
      onMove?.(part.id, x, y);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, [interactive, onSelect, onMove, toCanvas]);

  // Drag a profile control point: horizontal → radius, vertical → height
  // position (endpoints stay pinned at top/bottom).
  const handleSculptDown = useCallback((e, part, index) => {
    if (!interactive) return;
    e.stopPropagation();
    const prof = [...(part.dims?.profile || [])].sort((a, b) => a.t - b.t);
    const H = (part.dims?.heightCm || 8) * CANVAS.px;
    const isEnd = index === 0 || index === prof.length - 1;
    const move = (ev) => {
      const pt = toCanvas(ev.clientX, ev.clientY);
      const r = Math.max(0.2, Math.min(12, Math.round(((pt.x - part.x) / CANVAS.px) * 10) / 10));
      let t = prof[index].t;
      if (!isEnd) {
        t = (part.y + H / 2 - pt.y) / H;
        const lo = prof[index - 1].t + 0.02, hi = prof[index + 1].t - 0.02;
        t = Math.max(lo, Math.min(hi, Math.round(t * 100) / 100));
      }
      onSculpt?.(part.id, index, { r, t });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, [interactive, onSculpt, toCanvas]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CANVAS.w} ${CANVAS.h}`}
      className={`h-full w-full touch-none text-on-surface-variant ${className}`}
      onPointerDown={interactive ? () => onSelect?.(null) : undefined}
      role="img"
      aria-label="Design canvas"
    >
      <defs>
        <pattern id={ids.grid} width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.4" fill="currentColor" opacity="0.16" />
        </pattern>
        <pattern id={ids.stitch} width="10" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
          <path d="M0,2.5 L5,6.5 L10,2.5" fill="none" stroke="rgba(0,0,0,0.13)" strokeWidth="1.1" />
          <path d="M-5,7 L0,11 L5,7" fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="1.1" />
        </pattern>
        <radialGradient id={ids.sheen} cx="0.34" cy="0.26" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={ids.shade} cx="0.68" cy="0.78" r="0.8">
          <stop offset="0.4" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.2" />
        </radialGradient>
        <filter id={ids.shadow} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* design grid */}
      <rect width={CANVAS.w} height={CANVAS.h} fill={`url(#${ids.grid})`} />

      {/* ground shadow */}
      <ellipse cx={CANVAS.w / 2} cy={CANVAS.h - 16} rx={CANVAS.w * 0.3} ry={11} fill="#000" opacity="0.12" />

      {parts.map((part) => (
        <Part
          key={part.id}
          part={part}
          selected={interactive && selectedId === part.id}
          ids={ids}
          onPointerDown={interactive ? handleDown : null}
          onSculptDown={interactive ? handleSculptDown : null}
        />
      ))}
    </svg>
  );
}
