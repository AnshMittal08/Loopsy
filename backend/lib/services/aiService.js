import Anthropic from '@anthropic-ai/sdk';
import { generateId } from "../utils/helpers.js";

// ---------------------------------------------------------------------------
// Fallback pattern — returned when all AI attempts fail
// ---------------------------------------------------------------------------
const DEFAULT_PATTERN = {
  title: "Simple Practice Square",
  difficulty: "Beginner",
  category: "Practice",
  tags: ["starter", "texture"],
  materials: ["Worsted weight yarn", "5.0 mm hook", "Tapestry needle"],
  hookSize: "5.0 mm",
  yarnWeight: "Worsted",
  timeEstimate: "30–45 min",
  finishedSize: "5 × 5 in",
  notes: ["Fallback pattern — AI service was unavailable. Please try again."],
  steps: [
    { row: 1, instruction: "Chain 11." },
    { row: 2, instruction: "Single crochet in 2nd chain from hook and in each chain across. (10 stitches) Chain 1, turn." },
    { row: 3, instruction: "Single crochet in each stitch across. (10 stitches) Chain 1, turn." },
    { row: 4, instruction: "Repeat Row 3 until piece is square (approximately 10 rows)." },
    { row: 5, instruction: "Fasten off. Weave in ends with tapestry needle." },
  ],
};

// ---------------------------------------------------------------------------
// Claude API path — used when ANTHROPIC_API_KEY is set
// ---------------------------------------------------------------------------
const CLAUDE_TOOL = {
  name: "submit_crochet_pattern",
  description: "Submit a complete, ready-to-use crochet pattern in structured JSON.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Short descriptive pattern name" },
      difficulty: { type: "string", enum: ["Beginner", "Intermediate", "Advanced"] },
      category: { type: "string", description: "e.g. Wearable, Amigurumi, Blanket, Accessory, Home Decor" },
      hookSize: { type: "string", description: "e.g. 4.0 mm" },
      yarnWeight: { type: "string", description: "e.g. Worsted, DK, Bulky" },
      timeEstimate: { type: "string", description: "e.g. 3–5 hrs" },
      finishedSize: { type: "string", description: "e.g. 12 in diameter" },
      tags: { type: "array", items: { type: "string" }, description: "2–5 short descriptive tags" },
      materials: { type: "array", items: { type: "string" }, description: "Full materials list including yarn, hook, extras" },
      notes: { type: "array", items: { type: "string" }, description: "1–3 helpful maker notes or tips" },
      steps: {
        type: "array",
        description: "Step-by-step pattern instructions in order",
        items: {
          type: "object",
          properties: {
            row: { type: "number" },
            instruction: { type: "string", description: "Full plain-English instruction for this row/step — no abbreviations" },
          },
          required: ["row", "instruction"],
        },
        minItems: 5,
      },
    },
    required: ["title", "difficulty", "category", "hookSize", "yarnWeight", "timeEstimate", "finishedSize", "tags", "materials", "notes", "steps"],
  },
};

async function generateWithClaude(prompt, difficulty) {
  const client = new Anthropic();

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: `You are an expert crochet pattern designer with 20+ years of experience.
Generate accurate, detailed, beginner-friendly crochet patterns.
Always write instructions in FULL English — no abbreviations (write "single crochet" not "sc", "chain" not "ch", "double crochet" not "dc", etc.).
Provide enough rows/steps that someone could actually make the item.
Include realistic stitch counts in parentheses after each row.`,
    messages: [
      {
        role: "user",
        content: `Create a detailed crochet pattern for: "${prompt}"
Difficulty level: ${difficulty}
Please provide a complete, accurate pattern with all materials, steps, and maker notes.`,
      },
    ],
    tools: [CLAUDE_TOOL],
    tool_choice: { type: "any" },
  });

  const toolUse = message.content.find((b) => b.type === "tool_use" && b.name === "submit_crochet_pattern");
  if (!toolUse) throw new Error("Claude did not return a structured pattern");

  return toolUse.input;
}

// ---------------------------------------------------------------------------
// Ollama path — fallback when no API key
// ---------------------------------------------------------------------------
const OLLAMA_URL = 'http://localhost:11434/api/generate';

async function fetchWithTimeout(url, options = {}) {
  const { timeout = 90000, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function fixJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

function validateOllamaPattern(data) {
  if (!data || typeof data !== 'object') return false;
  if (!data.title || !data.difficulty) return false;
  if (!Array.isArray(data.steps) || data.steps.length === 0) return false;
  return data.steps.every((s) => typeof s.row === 'number' && typeof s.instruction === 'string');
}

async function generateWithOllama(prompt, difficulty, retryCount = 1) {
  const systemPrompt = `Act as a crochet expert. Generate a crochet pattern for: "${prompt}".
Difficulty: ${difficulty}. Write instructions in plain English (no abbreviations).
Return ONLY raw JSON — no markdown, no backticks.
Format: { "title": "...", "difficulty": "...", "steps": [{ "row": 1, "instruction": "..." }] }`;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const response = await fetchWithTimeout(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'phi3', prompt: systemPrompt, stream: false, format: 'json' }),
        timeout: 90000,
      });

      if (!response.ok) throw new Error(`Ollama error: ${response.status}`);

      const raw = await response.json();
      let parsed;
      try {
        parsed = JSON.parse(raw.response);
      } catch {
        parsed = JSON.parse(fixJson(raw.response));
      }

      if (validateOllamaPattern(parsed)) return parsed;
      throw new Error('Invalid pattern structure from Ollama');
    } catch (err) {
      console.warn(`Ollama attempt ${attempt + 1} failed: ${err.message}`);
      if (attempt === retryCount) return null;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Metadata enrichment (used for Ollama output which lacks full metadata)
// ---------------------------------------------------------------------------
function enrichPatternMetadata(pattern, prompt, difficulty) {
  const p = prompt.toLowerCase();
  const category = inferCategory(p);
  return {
    ...pattern,
    difficulty: pattern.difficulty || difficulty,
    category: pattern.category || category,
    tags: pattern.tags?.length ? pattern.tags : inferTags(p, category, difficulty),
    materials: pattern.materials?.length ? pattern.materials : inferMaterials(p, category),
    hookSize: pattern.hookSize || inferHookSize(p, category),
    yarnWeight: pattern.yarnWeight || inferYarnWeight(p, category),
    timeEstimate: pattern.timeEstimate || inferTimeEstimate(difficulty, category),
    finishedSize: pattern.finishedSize || inferFinishedSize(category),
    notes: pattern.notes?.length ? pattern.notes : inferNotes(category),
    promptSummary: prompt,
    isAIGenerated: true,
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export async function generatePatternFromAI(prompt, difficulty) {
  let patternData = null;
  let usedClaude = false;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      patternData = await generateWithClaude(prompt, difficulty);
      usedClaude = true;
    } catch (err) {
      console.warn('Claude generation failed, trying Ollama:', err.message);
    }
  }

  if (!patternData) {
    patternData = await generateWithOllama(prompt, difficulty);
  }

  if (!patternData) {
    console.error('All AI providers failed — returning fallback pattern.');
    return {
      id: generateId(),
      ...enrichPatternMetadata(DEFAULT_PATTERN, prompt, difficulty),
      title: `Fallback: ${DEFAULT_PATTERN.title}`,
      difficulty,
      createdAt: new Date().toISOString(),
      isFallback: true,
    };
  }

  const enriched = usedClaude
    ? { promptSummary: prompt, isAIGenerated: true, ...patternData }
    : enrichPatternMetadata(patternData, prompt, difficulty);

  return {
    id: generateId(),
    ...enriched,
    createdAt: new Date().toISOString(),
    isFallback: false,
  };
}

// ---------------------------------------------------------------------------
// Metadata helpers
// ---------------------------------------------------------------------------
function inferCategory(p) {
  if (p.includes('blanket') || p.includes('afghan')) return 'Blanket';
  if (p.includes('scarf') || p.includes('shawl') || p.includes('hat') || p.includes('sweater') || p.includes('glove') || p.includes('sock')) return 'Wearable';
  if (p.includes('bag') || p.includes('tote') || p.includes('purse')) return 'Accessory';
  if (p.includes('bear') || p.includes('bunny') || p.includes('amigurumi') || p.includes('plush') || p.includes('toy') || p.includes('animal')) return 'Amigurumi';
  if (p.includes('basket') || p.includes('coaster') || p.includes('plant') || p.includes('pillow') || p.includes('dishcloth')) return 'Home Decor';
  return 'Custom';
}

function inferTags(p, category, difficulty) {
  const tags = [category.toLowerCase(), difficulty.toLowerCase()];
  if (p.includes('gift')) tags.push('giftable');
  if (p.includes('quick') || p.includes('easy')) tags.push('quick-make');
  if (p.includes('baby') || p.includes('infant')) tags.push('baby');
  if (p.includes('holiday') || p.includes('christmas')) tags.push('seasonal');
  return [...new Set(tags)];
}

function inferMaterials(p, category) {
  const base = ['Tapestry needle', 'Scissors'];
  if (category === 'Amigurumi') return ['DK or cotton yarn', '3.5 mm hook', 'Polyfill stuffing', 'Safety eyes (2)', ...base];
  if (category === 'Accessory') return ['Cotton yarn', '4.5 mm hook', 'Stitch marker', ...base];
  if (p.includes('bulky')) return ['Bulky yarn', '6.0 mm hook', ...base];
  return ['Worsted weight yarn', '5.0 mm hook', ...base];
}

function inferHookSize(p, category) {
  if (category === 'Amigurumi') return '3.5 mm';
  if (p.includes('bulky')) return '6.0 mm';
  if (category === 'Accessory') return '4.5 mm';
  return '5.0 mm';
}

function inferYarnWeight(p, category) {
  if (category === 'Amigurumi') return 'DK or Cotton';
  if (p.includes('bulky')) return 'Bulky';
  if (p.includes('dk') || p.includes('sport')) return 'DK';
  return 'Worsted';
}

function inferTimeEstimate(difficulty, category) {
  if (category === 'Amigurumi') return difficulty === 'Advanced' ? '6–8 hrs' : '3–5 hrs';
  if (category === 'Blanket') return '15+ hrs';
  if (difficulty === 'Advanced') return '8–15 hrs';
  if (difficulty === 'Intermediate') return '3–6 hrs';
  return '1–3 hrs';
}

function inferFinishedSize(category) {
  if (category === 'Amigurumi') return '6–10 in tall';
  if (category === 'Accessory') return 'Everyday carry size';
  if (category === 'Wearable') return 'One size (adult)';
  if (category === 'Blanket') return '40 × 50 in';
  return 'Project dependent';
}

function inferNotes(category) {
  if (category === 'Amigurumi') return ['Work in tight stitches and stuff firmly as you go.'];
  if (category === 'Accessory') return ['Check handle or strap tension before finishing.'];
  if (category === 'Blanket') return ['Work a gauge swatch first for accurate sizing.'];
  return ['Swatch first if you need precise sizing.'];
}
