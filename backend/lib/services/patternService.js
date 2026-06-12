import { getTemplateById } from "../models/templateModel.js";
import { createPattern } from "../models/patternModel.js";
import { generateId, scaleStitchCount } from "../utils/helpers.js";
import { validatePattern } from "../engine/index.js";

const SIZE_FACTORS = {
  small: 0.75,
  medium: 1.0,
  large: 1.25,
};

/**
 * Generate a new pattern from a template + customization options.
 *
 * Customization logic:
 *  - color  → prefix every step with "Using [color] yarn: "
 *  - size   → scale stitch-count numbers via regex
 *              small = ×0.75 | medium = ×1.0 | large = ×1.25
 *
 * @param {string} templateId
 * @param {string} title
 * @param {{ color?: string, size?: string }} customization
 * @returns {{ pattern: Object, error: string|null }}
 */
export function generatePattern(templateId, title, customization = {}, options = {}) {
  const template = getTemplateById(templateId);

  if (!template) {
    return { pattern: null, error: `Template with id "${templateId}" not found.` };
  }

  const { color, size } = customization;
  const factor = SIZE_FACTORS[size?.toLowerCase()] ?? 1.0;

  // Clone the default steps
  let steps = [...template.defaultPattern];

  // Apply size scaling
  if (factor !== 1.0) {
    steps = steps.map((step) => scaleStitchCount(step, factor));
  }

  // Apply color prefix
  if (color && color.trim() !== "") {
    steps = steps.map((step) => `Using ${color.trim()} yarn: ${step}`);
  }

  // Convert to structured steps
  const structuredSteps = steps.map((step, index) => ({
    row: index + 1,
    instruction: step,
  }));

  // Earn the "Verified math" badge only when the validator can independently
  // re-derive every stitch count (size-scaled patterns usually can't pass).
  const validation = validatePattern(structuredSteps);

  const newPattern = {
    id: generateId(),
    userId: options.userId ?? null,
    title: title || `${template.name} Pattern`,
    templateId,
    customization: {
      color: color ?? null,
      size: size ?? "medium",
    },
    steps: structuredSteps,
    difficulty: template.difficulty,
    category: template.category,
    tags: template.tags ?? [],
    materials: template.materials ?? [],
    hookSize: template.hookSize ?? null,
    yarnWeight: template.yarnWeight ?? null,
    timeEstimate: template.timeEstimate ?? null,
    finishedSize: deriveFinishedSize(template.finishedSize, size ?? "medium"),
    notes: [
      ...(template.notes ?? []),
      color && color.trim() ? `Color direction: ${color.trim()} yarn.` : null,
    ].filter(Boolean),
    promptSummary: null,
    isAIGenerated: false,
    isFallback: false,
    verified: validation.verified,
    isExperimental: false,
    createdAt: new Date().toISOString(),
  };

  createPattern(newPattern);
  return { pattern: newPattern, error: null };
}

function deriveFinishedSize(templateSize, selectedSize) {
  if (!templateSize) return null;

  const prefixMap = {
    small: "Scaled down",
    medium: "Standard",
    large: "Scaled up"
  };

  return `${prefixMap[selectedSize] ?? "Standard"} fit: ${templateSize}`;
}
