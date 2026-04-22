import React from 'react';

export function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-surface-container-high ${className}`} />;
}

export function SkeletonTemplateCard() {
  return (
    <div className="overflow-hidden rounded-[1.75rem] bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant/10">
      <SkeletonBlock className="h-48 rounded-none rounded-t-[1.5rem]" />
      <div className="p-6 space-y-4">
        <div className="flex gap-2">
          <SkeletonBlock className="h-6 w-20 rounded-full" />
          <SkeletonBlock className="h-6 w-24 rounded-full" />
        </div>
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-4/5" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonBlock className="h-12 rounded-xl" />
          <SkeletonBlock className="h-12 rounded-xl" />
          <SkeletonBlock className="h-12 rounded-xl" />
          <SkeletonBlock className="h-12 rounded-xl" />
        </div>
        <div className="flex gap-3 pt-2">
          <SkeletonBlock className="h-11 flex-1 rounded-xl" />
          <SkeletonBlock className="h-11 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTrackerStep() {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg bg-surface-container-low animate-pulse">
      <SkeletonBlock className="h-6 w-6 rounded-full shrink-0" />
      <div className="flex-grow space-y-2">
        <SkeletonBlock className="h-4 w-16" />
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export function SkeletonTrackerLayout() {
  return (
    <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-[500px] animate-pulse">
      <div className="w-full md:w-5/12 rounded-[1.75rem] overflow-hidden">
        <SkeletonBlock className="h-56 rounded-none" />
        <div className="bg-surface-container-lowest p-5 space-y-4">
          <div className="flex gap-2">
            <SkeletonBlock className="h-6 w-20 rounded-full" />
            <SkeletonBlock className="h-6 w-20 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SkeletonBlock className="h-14 rounded-xl" />
            <SkeletonBlock className="h-14 rounded-xl" />
            <SkeletonBlock className="h-14 rounded-xl" />
            <SkeletonBlock className="h-14 rounded-xl" />
          </div>
        </div>
      </div>
      <div className="w-full md:w-7/12 rounded-xl border border-outline-variant/10 p-5 space-y-3">
        <SkeletonBlock className="h-6 w-48 mb-4" />
        {[...Array(5)].map((_, i) => (
          <SkeletonTrackerStep key={i} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTemplatePreview() {
  return (
    <div className="rounded-[1.75rem] bg-surface-container-lowest shadow-sm overflow-hidden animate-pulse">
      <SkeletonBlock className="h-56 rounded-none" />
      <div className="p-6 space-y-4">
        <SkeletonBlock className="h-6 w-48" />
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-3/4" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonBlock className="h-14 rounded-xl" />
          <SkeletonBlock className="h-14 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
