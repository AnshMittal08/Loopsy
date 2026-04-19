import templates from "../data/templates.json";

/**
 * Return all templates (summary view — no defaultPattern).
 * @returns {Array}
 */
export function getAllTemplates() {
  return templates.map(({ id, name, description, difficulty, previewImage }) => ({
    id,
    name,
    description,
    difficulty,
    previewImage,
  }));
}

/**
 * Return a single template by ID, including its defaultPattern.
 * @param {string} id
 * @returns {Object|null}
 */
export function getTemplateById(id) {
  return templates.find((t) => t.id === id) ?? null;
}
