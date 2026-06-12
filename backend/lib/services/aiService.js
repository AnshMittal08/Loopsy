import Anthropic from '@anthropic-ai/sdk';
import { generateId } from "../utils/helpers.js";
import {
  compileDesignSpec,
  validatePattern,
  SUPPORTED_SHAPES,
  SUPPORTED_STITCHES,
  HAT_SIZES,
} from "../engine/index.js";

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
// Compiler path (plan-v2 M2) — separate creative intent from arithmetic.
//
//   1. Claude Haiku parses the prompt into a Design Spec (cheap, structured).
//   2. The deterministic pattern compiler turns the spec into exact rounds
//      with COMPUTED stitch counts — never guessed.
//   3. Claude Sonnet humanizes the presentation (title, tags, notes, tips)
//      around the engine's numbers. It cannot alter any number because the
//      compiled steps are used verbatim.
//
// Shapes outside the compiler vocabulary fall back to freeform generation,
// labeled experimental, and only earn the verified badge if the validator
// can independently confirm every stitch count.
// ---------------------------------------------------------------------------
const DESIGN_SPEC_TOOL = {
  name: "submit_design_spec",
  description: "Submit a structured crochet Design Spec decomposing the requested object into supported geometric parts.",
  input_schema: {
    type: "object",
    properties: {
      feasible: {
        type: "boolean",
        description: "true ONLY if the requested object can be faithfully represented using the supported shapes alone. If the object needs colorwork charts, lace charts, garment shaping, or shapes outside the vocabulary, set false.",
      },
      name: { type: "string", description: "Short descriptive pattern name" },
      category: { type: "string", enum: ["Amigurumi", "Wearable", "Accessory", "Blanket", "Home Decor", "Custom"] },
      yarnWeight: { type: "string", description: "e.g. DK, Worsted, Bulky, Cotton" },
      parts: {
        type: "array",
        description: "The object decomposed into geometric parts, in working order",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "e.g. Head, Body, Ear" },
            shape: { type: "string", enum: SUPPORTED_SHAPES },
            dimensions: {
              type: "object",
              description: "Real-world finished dimensions in cm. sphere/hemisphere: diameterCm. ellipsoid: diameterCm (widest cross-section) + heightCm (long axis). tube: heightCm + diameterCm or circumferenceCm. cone: baseDiameterCm + heightCm. flatPanel: widthCm + heightCm. grannySquare: sideCm. hatCrown: size keyword instead.",
              properties: {
                diameterCm: { type: "number" },
                heightCm: { type: "number" },
                widthCm: { type: "number" },
                baseDiameterCm: { type: "number" },
                circumferenceCm: { type: "number" },
                sideCm: { type: "number" },
                size: { type: "string", enum: Object.keys(HAT_SIZES), description: "hatCrown only" },
              },
            },
            color: { type: "string", description: "Yarn color for this part, if specified or sensible" },
            stitch: { type: "string", enum: SUPPORTED_STITCHES },
            quantity: { type: "number", description: "How many of this part to make (e.g. 2 ears)" },
          },
          required: ["name", "shape", "dimensions"],
        },
      },
      assembly: { type: "array", items: { type: "string" }, description: "Plain-English assembly steps in order (sewing parts together, attaching safety eyes, etc.)" },
      embellishments: { type: "array", items: { type: "string" }, description: "Surface details: embroidery, stripes, appliqué" },
    },
    required: ["feasible", "name", "category", "yarnWeight", "parts"],
  },
};

async function parseDesignIntent(prompt, difficulty) {
  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: `You are the intent parser for a crochet pattern compiler. You translate a maker's request into a geometric Design Spec — you do NOT write pattern instructions and you NEVER compute stitch counts; a deterministic engine does the math.

Decompose the requested object into the supported shapes (${SUPPORTED_SHAPES.join(", ")}). Choose realistic finished dimensions in cm appropriate to the object and difficulty. Amigurumi animals are typically built from spheres (heads), ellipsoids (elongated bodies, eggs), cones (limbs, beaks), tubes (arms, legs, tails) and flat panels (ears). Be honest with the "feasible" flag: garments with shaping, lace charts, and complex colorwork are NOT feasible.`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Request: "${prompt}"\nDifficulty level: ${difficulty}`,
      },
    ],
    tools: [DESIGN_SPEC_TOOL],
    tool_choice: { type: "any" },
  });

  const toolUse = message.content.find((b) => b.type === "tool_use" && b.name === "submit_design_spec");
  if (!toolUse) throw new Error("Claude did not return a design spec");
  return toolUse.input;
}

const PRESENTATION_TOOL = {
  name: "submit_pattern_presentation",
  description: "Submit the human-friendly presentation for a machine-compiled crochet pattern.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Charming, descriptive pattern name" },
      difficulty: { type: "string", enum: ["Beginner", "Intermediate", "Advanced"] },
      tags: { type: "array", items: { type: "string" }, description: "2–5 short descriptive tags" },
      timeEstimate: { type: "string", description: "e.g. 3–5 hrs" },
      notes: {
        type: "array",
        items: { type: "string" },
        description: "1–3 friendly maker notes or tips. NEVER mention or alter any stitch count — the engine's numbers are final.",
      },
      extraMaterials: { type: "array", items: { type: "string" }, description: "Materials beyond yarn/hook/needle the maker will need (e.g. safety eyes), if any" },
    },
    required: ["title", "difficulty", "tags", "timeEstimate", "notes"],
  },
};

async function humanizeCompiledPattern(prompt, difficulty, compiled) {
  const client = new Anthropic();
  const partList = compiled.parts
    .map((p) => `${p.name} (${p.shape}${p.quantity > 1 ? ` ×${p.quantity}` : ""})`)
    .join(", ");

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: `You write the friendly presentation around machine-compiled crochet patterns. The pattern's rows and stitch counts were computed by a deterministic engine and are final — you may not alter, restate, or contradict any number. You only provide the title, tags, time estimate, and encouraging maker notes.`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Original request: "${prompt}"\nDifficulty: ${difficulty}\nCompiled parts: ${partList}\nYarn: ${compiled.yarnWeight}, hook: ${compiled.hookSize}, finished size: ${compiled.finishedSize}`,
      },
    ],
    tools: [PRESENTATION_TOOL],
    tool_choice: { type: "any" },
  });

  const toolUse = message.content.find((b) => b.type === "tool_use" && b.name === "submit_pattern_presentation");
  if (!toolUse) throw new Error("Claude did not return pattern presentation");
  return toolUse.input;
}

/**
 * Try the compiler pipeline. Returns a complete pattern object, or null when
 * the request is outside the compiler vocabulary (caller falls back).
 * Progress is reported through `emit` so the route can stream it live.
 */
async function generateWithCompiler(prompt, difficulty, emit) {
  emit({ type: 'status', stage: 'parsing', message: 'Reading your idea…' });
  const spec = await parseDesignIntent(prompt, difficulty);
  if (!spec || spec.feasible === false) return null;

  emit({ type: 'status', stage: 'compiling', message: 'Computing every stitch…' });
  const compiled = compileDesignSpec(spec);
  if (!compiled.ok) {
    console.warn("Design spec failed compilation:", compiled.errors);
    return null;
  }

  // Regression check: the validator re-derives every count independently.
  const validation = validatePattern(compiled.steps);
  if (validation.issues.length > 0) {
    // Engine and validator disagree — never ship unverified math silently.
    console.error("Compiler/validator disagreement:", validation.issues);
    return null;
  }

  // The math is settled — stream the rows out while the humanizer writes.
  for (const step of compiled.steps) {
    emit({ type: 'step', row: step.row, instruction: step.instruction });
  }

  emit({ type: 'status', stage: 'humanizing', message: 'Writing it up beautifully…' });
  let presentation = null;
  try {
    presentation = await humanizeCompiledPattern(prompt, difficulty, compiled);
  } catch (err) {
    console.warn("Humanizer failed, using inferred metadata:", err.message);
  }

  const category = compiled.spec.category;
  const materials = [
    ...compiled.materials,
    ...(presentation?.extraMaterials ?? []),
  ];

  return {
    title: presentation?.title || compiled.spec.name,
    difficulty: presentation?.difficulty || difficulty,
    category,
    tags: presentation?.tags?.length ? presentation.tags : inferTags(prompt.toLowerCase(), category, difficulty),
    materials: [...new Set(materials)],
    hookSize: compiled.hookSize,
    yarnWeight: compiled.yarnWeight,
    timeEstimate: presentation?.timeEstimate || inferTimeEstimate(difficulty, category),
    finishedSize: compiled.finishedSize,
    notes: presentation?.notes?.length ? presentation.notes : inferNotes(category),
    steps: compiled.steps.map(({ row, instruction }) => ({ row, instruction })),
    verified: true,
    isExperimental: false,
    promptSummary: prompt,
    isAIGenerated: true,
  };
}

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
    system: [
      {
        type: "text",
        text: `You are an expert crochet pattern designer with 20+ years of experience.
Generate accurate, detailed, beginner-friendly crochet patterns.
Always write instructions in FULL English — no abbreviations (write "single crochet" not "sc", "chain" not "ch", "double crochet" not "dc", etc.).

STEP DETAIL RULES:
- Each step must be a single, clear instruction a beginner can follow without guessing.
- Include the exact stitch count in parentheses at the end of each step.
- For each step, describe WHERE to insert the hook (e.g. "in the 2nd chain from hook", "in the next stitch", "in the same stitch").
- When a step introduces a new technique, add a brief clarification in parentheses (e.g. "Yarn over and pull through all 3 loops on hook (this completes the decrease)").
- Number every row/round explicitly — never combine ranges like "Rows 2–12". Write each row or explicitly state "Repeat Row 2 for X more rows".
- Include turning instructions ("Chain 1, turn") as part of the step, not as a separate step.
- For shaping rounds, state both the action AND the resulting stitch count.
- Minimum 8 steps for any pattern, 12+ for intermediate/advanced.`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Create a detailed crochet pattern for: "${prompt}"
Difficulty level: ${difficulty}
Please provide a complete, accurate pattern with all materials, detailed step-by-step instructions, and maker notes. Each step should be detailed enough that a beginner could follow it without additional reference.`,
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
export async function generatePatternFromAI(prompt, difficulty, onEvent) {
  const emit = typeof onEvent === 'function' ? onEvent : () => {};
  let patternData = null;
  let usedClaude = false;

  if (process.env.ANTHROPIC_API_KEY) {
    // 1. Compiler pipeline: intent → deterministic geometry → humanized
    //    presentation. Counts are computed, so the result ships verified.
    try {
      patternData = await generateWithCompiler(prompt, difficulty, emit);
    } catch (err) {
      console.warn('Compiler pipeline failed, falling back to freeform:', err.message);
    }

    // 2. Freeform fallback for shapes outside the compiler vocabulary.
    //    Labeled experimental; only verified if the validator can prove it.
    if (!patternData) {
      try {
        emit({ type: 'status', stage: 'drafting', message: 'Drafting a freeform pattern…' });
        const freeform = await generateWithClaude(prompt, difficulty);
        for (const step of freeform.steps) {
          emit({ type: 'step', row: step.row, instruction: step.instruction });
        }
        const validation = validatePattern(freeform.steps);
        patternData = {
          ...freeform,
          verified: validation.verified,
          isExperimental: true,
          notes: [
            ...(freeform.notes ?? []),
            validation.verified
              ? null
              : 'Experimental pattern: this design is outside our verified geometry engine — double-check stitch counts as you work.',
          ].filter(Boolean),
        };
        usedClaude = true;
      } catch (err) {
        console.warn('Claude generation failed, trying Ollama:', err.message);
      }
    }
  }

  if (!patternData) {
    emit({ type: 'status', stage: 'drafting', message: 'Drafting with the local model…' });
    const ollamaPattern = await generateWithOllama(prompt, difficulty);
    if (ollamaPattern) {
      for (const step of ollamaPattern.steps) {
        emit({ type: 'step', row: step.row, instruction: step.instruction });
      }
      const validation = validatePattern(ollamaPattern.steps);
      patternData = {
        ...ollamaPattern,
        verified: validation.verified,
        isExperimental: true,
      };
    }
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
      verified: false,
      isExperimental: true,
    };
  }

  const enriched = usedClaude || patternData.promptSummary
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
