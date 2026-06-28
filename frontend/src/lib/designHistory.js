// History helpers for the Design Canvas undo/redo stack.
//
// The undoable design state is exactly five fields: name, parts, assemblySteps,
// assemblyEdited, embellishments. `parts` carry nested dims/profile/colorPlan,
// so a snapshot MUST deep-copy parts to avoid aliasing across history entries.

export const HISTORY_LIMIT = 50;

// Deep-clone a value (parts arrays carry nested objects). structuredClone when
// available, JSON fallback otherwise — both fully detach nested dims/profile.
function deepClone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

// Build an immutable snapshot of the five undoable fields. `parts` is deep
// copied so later mutations of dims/profile/colorPlan never reach back here.
export function makeSnapshot({ name, parts, assemblySteps, assemblyEdited, embellishments }) {
  return {
    name,
    parts: deepClone(parts),
    assemblySteps: deepClone(assemblySteps),
    assemblyEdited,
    embellishments: deepClone(embellishments),
  };
}
