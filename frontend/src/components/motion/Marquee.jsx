// Editorial marquee strip — a slow, seamless loop of craft words punctuated
// by yarn-colored asterisks. Pure CSS animation (killed by the global
// reduced-motion switch).
import { Asterisk } from 'lucide-react';

const YARN_TEXT_CLASSES = [
  'text-yarn-coral',
  'text-yarn-marigold',
  'text-yarn-sage',
  'text-yarn-periwinkle',
  'text-yarn-rose',
];

export default function Marquee({ items, className = '' }) {
  const row = (ariaHidden) => (
    <div className="marquee-row flex shrink-0 items-center" aria-hidden={ariaHidden}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center">
          <span className="whitespace-nowrap font-display text-lg font-semibold tracking-tight text-on-surface-variant md:text-xl">
            {item}
          </span>
          <Asterisk size={20} className={`mx-5 shrink-0 ${YARN_TEXT_CLASSES[i % YARN_TEXT_CLASSES.length]}`} />
        </span>
      ))}
    </div>
  );

  return (
    <div className={`flex overflow-hidden select-none ${className}`}>
      {row(false)}
      {row(true)}
    </div>
  );
}
