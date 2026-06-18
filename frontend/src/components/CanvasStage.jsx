import React, { useRef, useCallback } from 'react';
import { hexOf } from '../lib/yarnColors';
import { partGeometry } from '../lib/shapeKit';
import { CANVAS } from '../lib/assembly';

// Interactive (or read-only) SVG stage where parts are placed and dragged.
// Coordinates live in a canonical canvas space (CANVAS.w × CANVAS.h, px/cm),
// so the editor and the share page render designs identically.

function Shape({ part, selected, onPointerDown }) {
  const g = partGeometry(part, CANVAS.px);
  const fill = hexOf(part.color);
  const stroke = selected ? 'var(--primary)' : 'rgba(0,0,0,0.12)';
  const sw = selected ? 2.5 : 1;
  const common = {
    fill,
    stroke,
    strokeWidth: sw,
    style: { cursor: onPointerDown ? 'grab' : 'default' },
    onPointerDown: onPointerDown ? (e) => onPointerDown(e, part) : undefined,
  };
  let el;
  if (g.type === 'circle') el = <circle cx={g.cx} cy={g.cy} r={g.r} {...common} />;
  else if (g.type === 'ellipse') el = <ellipse cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} {...common} />;
  else if (g.type === 'rect') el = <rect x={g.x} y={g.y} width={g.width} height={g.height} rx={g.rx} {...common} />;
  else if (g.type === 'polygon') el = <polygon points={g.points} {...common} />;
  else if (g.type === 'path') el = <path d={g.d} {...common} />;
  return el;
}

export default function CanvasStage({ parts, selectedId, onSelect, onMove, interactive = true, className = '' }) {
  const svgRef = useRef(null);

  const toCanvas = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }, []);

  // Self-contained drag: pointer listeners live for the duration of one drag,
  // so there are no shared refs to read during render.
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

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CANVAS.w} ${CANVAS.h}`}
      className={`h-full w-full touch-none ${className}`}
      onPointerDown={interactive ? () => onSelect?.(null) : undefined}
      role="img"
      aria-label="Design canvas"
    >
      <ellipse cx={CANVAS.w / 2} cy={CANVAS.h - 18} rx={CANVAS.w * 0.34} ry={12} fill="rgba(0,0,0,0.14)" />
      {parts.map((part) => (
        <Shape key={part.id} part={part} selected={interactive && selectedId === part.id} onPointerDown={interactive ? handleDown : null} />
      ))}
    </svg>
  );
}
