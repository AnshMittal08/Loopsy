import React, { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'motion/react';
import {
  Upload, Camera, X, Sparkles, ShieldCheck, ImagePlus, AlertCircle, Pencil, Trash2,
} from 'lucide-react';
import { ThreadSpinner } from './motion/Thread';
import ConfirmDialog from './ConfirmDialog';
import Magnetic from './motion/Magnetic';
import { SPRING, fadeRise, staggerChildren } from '../lib/motionTokens';

const MAX_IMAGES = 3;
const MAX_BYTES = 5 * 1024 * 1024;

const CONFIDENCE_STYLE = {
  high: { label: 'High confidence', cls: 'bg-secondary-container text-on-secondary-container' },
  medium: { label: 'Medium confidence', cls: 'bg-tertiary-container text-on-tertiary-container' },
  low: { label: 'Low confidence — double-check', cls: 'bg-error-container text-on-error-container' },
};

// Human labels for the dimension keys the engine understands.
const DIM_LABEL = {
  diameterCm: 'Diameter',
  heightCm: 'Height',
  widthCm: 'Width',
  baseDiameterCm: 'Base ⌀',
  circumferenceCm: 'Circumference',
  sideCm: 'Side',
};

function blobToImage(blob, mediaType, name) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const data = result.split(',')[1]; // strip the data: URL prefix
      resolve({ media_type: mediaType, data, preview: result, name });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// iPhones shoot HEIC/HEIF by default, which Claude vision can't read. Detect
// it (the browser often reports an empty MIME type, so also check the name)
// and convert to JPEG in the browser via a lazily-loaded encoder, so the
// heavy WASM library never enters the initial bundle.
const HEIC_RE = /\.(heic|heif)$/i;
function isHeic(file) {
  return /image\/(heic|heif)/i.test(file.type) || HEIC_RE.test(file.name || '');
}
async function convertHeic(file) {
  const heic2any = (await import('heic2any')).default;
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
  return Array.isArray(out) ? out[0] : out;
}

/* ── Upload zone ───────────────────────────────────────────────── */
function UploadZone({ images, setImages, disabled }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [converting, setConverting] = useState(false);

  const addFiles = useCallback(async (files) => {
    setLocalError(null);
    const accepted = [];
    for (const file of files) {
      try {
        let blob = file;
        let mediaType = file.type;
        let name = file.name;
        if (isHeic(file)) {
          setConverting(true);
          blob = await convertHeic(file);
          mediaType = 'image/jpeg';
          name = (file.name || 'photo').replace(HEIC_RE, '') + '.jpg';
        }
        if (!/^image\/(jpeg|png|webp|gif)$/.test(mediaType)) {
          setLocalError('Only JPEG, PNG, WebP, GIF, or HEIC images are supported.');
          continue;
        }
        if (blob.size > MAX_BYTES) {
          setLocalError('Each image must be under 5 MB.');
          continue;
        }
        accepted.push(await blobToImage(blob, mediaType, name));
      } catch {
        setLocalError("Couldn't read that image. If it's a HEIC photo, try converting it to JPEG first.");
      }
    }
    setConverting(false);
    setImages((prev) => [...prev, ...accepted].slice(0, MAX_IMAGES));
  }, [setImages]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    addFiles(Array.from(e.dataTransfer.files || []));
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-primary bg-primary/8' : 'border-outline-variant/40 hover:border-primary/40 hover:bg-surface-container-low'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Upload size={22} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-on-surface">Drop a photo of your crochet item</p>
          <p className="mt-1 text-xs text-on-surface-variant">or click to browse · up to {MAX_IMAGES} images · JPEG/PNG/WebP</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
          multiple
          capture="environment"
          className="hidden"
          onChange={(e) => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }}
        />
      </div>

      {converting && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-on-surface-variant">
          <ThreadSpinner size={13} /> Converting HEIC photo…
        </p>
      )}
      {localError && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-error"><AlertCircle size={13} /> {localError}</p>
      )}

      {images.length > 0 && (
        <Motion.div variants={staggerChildren(0.05)} initial="hidden" animate="visible" className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img, i) => (
            <Motion.div key={i} variants={fadeRise} className="group relative aspect-square overflow-hidden rounded-xl border border-outline-variant/20">
              <img src={img.preview} alt={`upload ${i + 1}`} className="h-full w-full object-cover" />
              {!disabled && (
                <button
                  onClick={(e) => { e.stopPropagation(); setImages((prev) => prev.filter((_, idx) => idx !== i)); }}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-surface-container-lowest/90 text-on-surface opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove image"
                >
                  <X size={13} />
                </button>
              )}
            </Motion.div>
          ))}
          {images.length < MAX_IMAGES && !disabled && (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-outline-variant/40 text-on-surface-variant hover:border-primary/40 hover:text-primary transition-colors"
              aria-label="Add another image"
            >
              <ImagePlus size={20} />
            </button>
          )}
        </Motion.div>
      )}
    </div>
  );
}

/* ── Analysis review — editable chips before compiling ─────────── */
function AnalysisReview({ analysis, onChange, onCompile, onDiscard, disabled }) {
  const { confidence, observed, spec } = analysis;
  const conf = CONFIDENCE_STYLE[confidence] || CONFIDENCE_STYLE.low;

  const updatePart = (index, patch) => {
    const parts = spec.parts.map((p, i) => (i === index ? { ...p, ...patch } : p));
    onChange({ ...analysis, spec: { ...spec, parts } });
  };
  const updateDim = (index, key, value) => {
    const part = spec.parts[index];
    updatePart(index, { dimensions: { ...part.dimensions, [key]: value === '' ? '' : Number(value) } });
  };
  const removePart = (index) => {
    onChange({ ...analysis, spec: { ...spec, parts: spec.parts.filter((_, i) => i !== index) } });
  };

  return (
    <Motion.div variants={staggerChildren(0.06)} initial="hidden" animate="visible" className="space-y-5">
      {/* Readout header */}
      <Motion.div variants={fadeRise} className="rounded-2xl bg-surface-container-low border border-outline-variant/20 p-5">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles size={12} /> Here's what I see
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${conf.cls}`}>{conf.label}</span>
        </div>
        <Motion.div initial="hidden" animate="visible" variants={staggerChildren(0.05)} className="flex flex-wrap gap-2">
          {observed.map((o, i) => (
            <Motion.span key={i} variants={fadeRise} className="rounded-full bg-surface px-3 py-1.5 text-xs text-on-surface-variant">{o}</Motion.span>
          ))}
        </Motion.div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-on-surface-variant">
          <Pencil size={12} className="text-primary" />
          Correct anything below before generating — fixing the size or colors now makes the pattern accurate.
        </p>
      </Motion.div>

      {/* Editable parts */}
      <Motion.div variants={fadeRise}>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary mb-3">Parts ({spec.parts.length})</h3>
        <div className="space-y-3">
          {spec.parts.map((part, i) => (
            <div key={i} className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-4 shadow-warm">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    value={part.name}
                    onChange={(e) => updatePart(i, { name: e.target.value })}
                    disabled={disabled}
                    className="min-w-0 flex-1 bg-transparent font-semibold text-sm text-on-surface outline-none border-b border-transparent focus:border-primary/40"
                  />
                  <span className="shrink-0 rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-semibold text-on-secondary-container">{part.shape}</span>
                  {part.quantity > 1 && <span className="shrink-0 text-[10px] font-semibold text-on-surface-variant">×{part.quantity}</span>}
                </div>
                {spec.parts.length > 1 && !disabled && (
                  <button onClick={() => removePart(i)} className="shrink-0 text-on-surface-variant hover:text-error transition-colors" aria-label="Remove part">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {Object.entries(part.dimensions || {}).filter(([k]) => DIM_LABEL[k]).map(([key, value]) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">{DIM_LABEL[key]} (cm)</span>
                    <input
                      type="number" min="0.5" max="200" step="0.5" value={value} disabled={disabled}
                      onChange={(e) => updateDim(i, key, e.target.value)}
                      className="w-24 rounded-lg bg-surface-container-low px-3 py-1.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                ))}
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant">Color</span>
                  <input
                    value={part.color || ''} disabled={disabled} placeholder="e.g. mustard"
                    onChange={(e) => updatePart(i, { color: e.target.value })}
                    className="w-32 rounded-lg bg-surface-container-low px-3 py-1.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </Motion.div>

      {/* Yarn weight */}
      <Motion.div variants={fadeRise} className="flex items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">Yarn</span>
        <input
          value={spec.yarnWeight || ''} disabled={disabled}
          onChange={(e) => onChange({ ...analysis, spec: { ...spec, yarnWeight: e.target.value } })}
          className="rounded-lg bg-surface-container-low px-3 py-1.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30"
        />
      </Motion.div>

      {/* Policy + actions */}
      <Motion.div variants={fadeRise} className="flex items-start gap-2 rounded-xl bg-surface-container-low px-4 py-3">
        <ShieldCheck size={15} className="mt-0.5 shrink-0 text-secondary" />
        <p className="text-xs text-on-surface-variant">AI-generated patterns are for your personal use. Please don't resell them or claim them as original designs.</p>
      </Motion.div>

      <Motion.div variants={fadeRise} className="flex flex-wrap items-center justify-end gap-3">
        <button onClick={onDiscard} disabled={disabled} className="rounded-full border border-outline-variant/30 px-5 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-50">
          Start over
        </button>
        <Magnetic>
          <button
            onClick={() => onCompile(spec)}
            disabled={disabled || spec.parts.length === 0}
            className="shine-sweep inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm-md disabled:opacity-50"
          >
            <Sparkles size={16} />
            Generate verified pattern
          </button>
        </Magnetic>
      </Motion.div>
    </Motion.div>
  );
}

/* ── Vision Studio container ───────────────────────────────────── */
export default function VisionStudio({ onCompile, disabled }) {
  const [images, setImages] = useState([]);
  const [hint, setHint] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [trialUsed, setTrialUsed] = useState(false);

  // UX-11: never spend the one lifetime free analysis on an accidental click.
  const [confirmAnalyze, setConfirmAnalyze] = useState(false);
  const requestAnalyze = async () => {
    try {
      const res = await fetch('/api/usage');
      if (res.ok) {
        const u = await res.json();
        if (u?.vision?.mode === 'trial') { setConfirmAnalyze(true); return; }
      }
    } catch { /* usage unknown — proceed; the server still enforces limits */ }
    analyze();
  };

  const analyze = async () => {
    setAnalyzing(true);
    setError(null);
    setTrialUsed(false);
    try {
      const res = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: images.map(({ media_type, data }) => ({ media_type, data })),
          hint: hint.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) { setTrialUsed(true); setError(data.error); return; }
        throw new Error(data.error || 'Analysis failed');
      }
      if (!data.feasible) {
        setError("This piece is outside our verified shapes (it may need lace, colorwork, or garment shaping). Try a photo of an amigurumi or a simple round/flat piece.");
      }
      setAnalysis(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => { setImages([]); setHint(''); setAnalysis(null); setError(null); setTrialUsed(false); };

  if (analyzing) {
    return (
      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-12 text-center">
        <div className="flex flex-col items-center gap-5">
          <ThreadSpinner size={64} />
          <div>
            <p className="text-sm font-semibold text-on-surface">Looking closely at your photo…</p>
            <p className="mt-1 text-xs text-on-surface-variant">Identifying shapes, sizes, and colors.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING.gentle}>
      {(error || trialUsed) && (
        <div className="mb-5 flex items-start gap-3 rounded-xl bg-error-container px-4 py-3 text-on-error-container">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <p className="flex-1 text-sm">
            {error}
            {trialUsed && <Link to="/account" className="ml-1 font-semibold underline">View plans →</Link>}
          </p>
          <button onClick={() => { setError(null); setTrialUsed(false); }} className="shrink-0 hover:opacity-70"><X size={15} /></button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!analysis ? (
          <Motion.div key="upload" exit={{ opacity: 0 }}>
            <UploadZone images={images} setImages={setImages} disabled={disabled} />

            <div className="mt-4">
              <label className="block text-sm font-semibold text-on-surface mb-2">
                Add a note <span className="font-normal text-on-surface-variant">(optional)</span>
              </label>
              <input
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                disabled={disabled}
                maxLength={200}
                placeholder="Anything the photo can't show — e.g. it's 10 cm tall, mustard yarn"
                className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl bg-tertiary-container/40 border border-tertiary/20 p-4">
              <Camera size={15} className="mt-0.5 shrink-0 text-tertiary" />
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Works best on amigurumi and simple round or flat pieces against a plain background. We analyze the photo to draft an editable design — your image isn't stored.
              </p>
            </div>
            {confirmAnalyze && (
              <ConfirmDialog
                title="Use your free Vision analysis?"
                body="Your free plan includes one lifetime photo analysis. Once spent it can't be redone — make sure the photo is clear and well-lit. Compiling the pattern afterwards is free."
                confirmLabel="Analyze photo"
                danger={false}
                onConfirm={() => { setConfirmAnalyze(false); analyze(); }}
                onCancel={() => setConfirmAnalyze(false)}
              />
            )}
            <div className="mt-6 flex justify-end">
              <Magnetic>
                <button
                  onClick={requestAnalyze}
                  disabled={images.length === 0}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles size={16} />
                  Analyze photo
                </button>
              </Magnetic>
            </div>
          </Motion.div>
        ) : (
          <Motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AnalysisReview
              analysis={analysis}
              onChange={setAnalysis}
              onCompile={onCompile}
              onDiscard={reset}
              disabled={disabled}
            />
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.div>
  );
}
