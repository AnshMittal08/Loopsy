import { getTemplateById } from "../models/templateModel.js";
import { createPattern } from "../models/patternModel.js";
import { generateId, scaleStitchCount } from "../utils/helpers.js";

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
export function generatePattern(templateId, title, customization = {}) {
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

  const newPattern = {
    id: generateId(),
    title: title || `${template.name} Pattern`,
    templateId,
    customization: {
      color: color ?? null,
      size: size ?? "medium",
    },
    steps,
    difficulty: template.difficulty,
    createdAt: new Date().toISOString(),
  };

  createPattern(newPattern);
  return { pattern: newPattern, error: null };
}
