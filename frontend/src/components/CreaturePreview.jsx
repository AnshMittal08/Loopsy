import React, { useMemo } from 'react';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { hexOf } from '../lib/yarnColors';

// Bucket a Design Spec's parts into creature roles by name + shape heuristics,
// so the preview works for canvas-built and photo-derived specs alike.
function rolesFromSpec(spec) {
  const roles = {};
  for (const part of spec?.parts || []) {
    const n = (part.name || '').toLowerCase();
    const d = part.dimensions || {};
    let role = 'other';
    if (/head|skull/.test(n)) role = 'head';
    else if (/body|torso|belly/.test(n)) role = 'body';
    else if (/ear/.test(n)) role = 'ears';
    else if (/arm|wing|paw|hand/.test(n)) role = 'arms';
    else if (/leg|foot|feet/.test(n)) role = 'legs';
    else if (/muzzle|snout|nose|beak/.test(n)) role = 'muzzle';
    else if (/tail/.test(n)) role = 'tail';
    else if (part.shape === 'sphere' && !roles.head) role = 'head';
    else if (part.shape === 'ellipsoid' && !roles.body) role = 'body';
    if (!roles[role]) roles[role] = { ...part, dimensions: d };
  }
  return roles;
}

const primarySize = (part, fallback) => {
  if (!part) return fallback;
  const d = part.dimensions || {};
  return d.diameterCm || d.heightCm || d.baseDiameterCm || d.widthCm || d.sideCm || fallback;
};

/**
 * Spec-driven creature preview. Renders parts as positioned, color-coded
 * shapes sized proportionally to their cm dimensions. Springs on change, so
 * it doubles as the live canvas preview and the static share-page hero.
 */
export default function CreaturePreview({ spec, className = '' }) {
  const roles = useMemo(() => rolesFromSpec(spec), [spec]);
  const spring = { type: 'spring', stiffness: 200, damping: 18 };

  const PX = 6; // px per cm
  const headD = primarySize(roles.head, 8);
  const headR = Math.max(16, Math.min(46, (headD / 2) * PX));
  const bodyW = primarySize(roles.body, 7);
  const bodyH = roles.body?.dimensions?.heightCm || 9;
  const bodyRx = Math.max(16, Math.min(40, (bodyW / 2) * PX));
  const bodyRy = Math.max(20, Math.min(52, (bodyH / 2) * PX));
  const limbH = Math.max(18, Math.min(48, primarySize(roles.arms || roles.legs, 6) * PX));

  const cx = 110;
  const headCy = 64;
  const bodyCy = headCy + headR + bodyRy - 6;

  const col = (role, fallback = 'cream') => hexOf(roles[role]?.color || fallback);

  return (
    <svg viewBox="0 0 220 290" className={`h-full w-full ${className}`} role="img" aria-label={spec?.name || 'Creature design'}>
      <ellipse cx={cx} cy={272} rx={bodyRx * 1.1} ry={9} fill="rgba(0,0,0,0.18)" />

      <AnimatePresence>
        {roles.tail && (
          <Motion.circle key="tail" cx={cx + bodyRx - 4} cy={bodyCy + bodyRy - 14} r={Math.max(6, primarySize(roles.tail, 2.5) * PX * 0.5)}
            fill={col('tail')} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {roles.legs && (
          <Motion.g key="legs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={spring}>
            <rect x={cx - bodyRx * 0.55 - 6} y={bodyCy + bodyRy - 8} width={12} height={limbH} rx={6} fill={col('legs')} />
            <rect x={cx + bodyRx * 0.55 - 6} y={bodyCy + bodyRy - 8} width={12} height={limbH} rx={6} fill={col('legs')} />
          </Motion.g>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {roles.arms && (
          <Motion.g key="arms" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={spring}>
            <rect x={cx - bodyRx - 8} y={bodyCy - 8} width={11} height={limbH} rx={5.5} fill={col('arms')} transform={`rotate(18 ${cx - bodyRx} ${bodyCy})`} />
            <rect x={cx + bodyRx - 3} y={bodyCy - 8} width={11} height={limbH} rx={5.5} fill={col('arms')} transform={`rotate(-18 ${cx + bodyRx} ${bodyCy})`} />
          </Motion.g>
        )}
      </AnimatePresence>

      {roles.body && (
        <Motion.ellipse cx={cx} cy={bodyCy} rx={bodyRx} ry={bodyRy} fill={col('body')} animate={{ rx: bodyRx, ry: bodyRy, cy: bodyCy }} transition={spring} />
      )}

      <AnimatePresence>
        {roles.ears && (
          <Motion.g key="ears" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring}>
            <circle cx={cx - headR * 0.6} cy={headCy - headR * 0.7} r={Math.max(7, primarySize(roles.ears, 3) * PX * 0.5)} fill={col('ears')} />
            <circle cx={cx + headR * 0.6} cy={headCy - headR * 0.7} r={Math.max(7, primarySize(roles.ears, 3) * PX * 0.5)} fill={col('ears')} />
          </Motion.g>
        )}
      </AnimatePresence>

      {roles.head && (
        <Motion.circle cx={cx} cy={headCy} r={headR} fill={col('head')} animate={{ r: headR, cy: headCy }} transition={spring} />
      )}

      {roles.head && (
        <>
          <circle cx={cx - headR * 0.35} cy={headCy - 2} r={3.2} fill="#1A1726" />
          <circle cx={cx + headR * 0.35} cy={headCy - 2} r={3.2} fill="#1A1726" />
        </>
      )}

      <AnimatePresence>
        {roles.muzzle && (
          <Motion.circle key="muzzle" cx={cx} cy={headCy + headR * 0.35} r={Math.max(8, primarySize(roles.muzzle, 3) * PX * 0.5)}
            fill={col('muzzle', 'white')} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring} />
        )}
      </AnimatePresence>
    </svg>
  );
}
