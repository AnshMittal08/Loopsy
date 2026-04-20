import { generateId } from "../utils/helpers.js";

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'phi3';

const DEFAULT_PATTERN = {
  title: "Simple Practice Square",
  difficulty: "Beginner",
  category: "Practice",
  tags: ["starter", "texture"],
  materials: ["Worsted weight yarn", "5.0 mm hook", "Tapestry needle"],
  hookSize: "5.0 mm",
  yarnWeight: "Worsted",
  timeEstimate: "30-45 min",
  finishedSize: "5 x 5 in",
  notes: ["Fallback pattern generated because the AI service was unavailable."],
  steps: [
    { row: 1, instruction: "Chain 11." },
    { row: 2, instruction: "SC in 2nd ch from hook and in each ch across. (10 sc) Ch 1, turn." },
    { row: 3, instruction: "SC in each st across. (10 sc) Ch 1, turn." },
    { row: 4, instruction: "Repeat Row 3 until piece is square." },
    { row: 5, instruction: "Fasten off and weave in ends." }
  ]
};

function validatePattern(data) {
  if (!data || typeof data !== 'object') return false;
  if (!data.title || typeof data.title !== 'string') return false;
  if (!data.difficulty || typeof data.difficulty !== 'string') return false;
  if (!Array.isArray(data.steps) || data.steps.length === 0) return false;
  
  for (const step of data.steps) {
    if (typeof step.row !== 'number' || typeof step.instruction !== 'string') return false;
  }
  return true;
}

function enrichPatternMetadata(pattern, prompt, difficulty) {
  const normalizedPrompt = prompt.toLowerCase();
  const category = inferCategory(normalizedPrompt);

  return {
    ...pattern,
    difficulty: pattern.difficulty || difficulty,
    category: pattern.category || category,
    tags: Array.isArray(pattern.tags) && pattern.tags.length > 0
      ? pattern.tags
      : inferTags(normalizedPrompt, category, difficulty),
    materials: Array.isArray(pattern.materials) && pattern.materials.length > 0
      ? pattern.materials
      : inferMaterials(normalizedPrompt, category),
    hookSize: pattern.hookSize || inferHookSize(normalizedPrompt, category),
    yarnWeight: pattern.yarnWeight || inferYarnWeight(normalizedPrompt, category),
    timeEstimate: pattern.timeEstimate || inferTimeEstimate(difficulty, category),
    finishedSize: pattern.finishedSize || inferFinishedSize(category),
    notes: Array.isArray(pattern.notes) && pattern.notes.length > 0
      ? pattern.notes
      : inferNotes(category),
    promptSummary: prompt,
    isAIGenerated: true
  };
}

function fixJson(text) {
  // Try to extract JSON from markdown code blocks or curly braces if LLM added chatter
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    return match[0];
  }
  return text;
}

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 90000 } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal  
  });
  clearTimeout(id);
  return response;
}

export async function generatePatternFromAI(prompt, difficulty, retryCount = 1) {
  const systemPrompt = `Act as a crochet expert. Generate a crochet pattern for: "${prompt}".
Rules:
- Difficulty must be: ${difficulty}
- Use standard abbreviations (sc, inc, dec)
- Provide step-by-step rows
- Return ONLY raw JSON format with no markdown, no conversational text, and no backticks.
Format:
{
  "title": "...",
  "difficulty": "...",
  "steps": [{ "row": 1, "instruction": "..." }]
}`;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const response = await fetchWithTimeout(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          prompt: systemPrompt,
          stream: false,
          format: 'json' // Instruct Ollama to output json
        }),
        timeout: 90000 // 90 seconds
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const responseData = await response.json();
      const aiText = responseData.response;

      // Parse JSON
      let parsedData;
      try {
        parsedData = JSON.parse(aiText);
      } catch (e) {
        parsedData = JSON.parse(fixJson(aiText));
      }

      // Validate
      if (validatePattern(parsedData)) {
        return {
          id: generateId(),
          ...enrichPatternMetadata(parsedData, prompt, difficulty),
          createdAt: new Date().toISOString()
        };
      } else {
        throw new Error('Invalid pattern structure returned from AI');
      }

    } catch (error) {
      console.warn(`Attempt ${attempt + 1} failed: ${error.message}`);
      if (attempt === retryCount) {
        console.error("All AI attempts failed, returning default pattern.");
        return {
          id: generateId(),
          ...enrichPatternMetadata(DEFAULT_PATTERN, prompt, difficulty),
          title: `Fallback: ${DEFAULT_PATTERN.title}`, // clearly indicate it's a fallback
          difficulty: difficulty, // Override to requested difficulty
          createdAt: new Date().toISOString(),
          isFallback: true
        };
      }
    }
  }
}

function inferCategory(prompt) {
  if (prompt.includes('blanket')) return 'Blanket';
  if (prompt.includes('scarf') || prompt.includes('shawl')) return 'Wearable';
  if (prompt.includes('bag') || prompt.includes('tote')) return 'Accessory';
  if (prompt.includes('bear') || prompt.includes('amigurumi') || prompt.includes('plush')) return 'Amigurumi';
  if (prompt.includes('coaster') || prompt.includes('basket')) return 'Home';
  return 'Custom';
}

function inferTags(prompt, category, difficulty) {
  const tags = [category.toLowerCase(), difficulty.toLowerCase()];
  if (prompt.includes('gift')) tags.push('giftable');
  if (prompt.includes('quick')) tags.push('quick-make');
  if (prompt.includes('textured')) tags.push('texture');
  if (prompt.includes('baby')) tags.push('baby');
  return [...new Set(tags)];
}

function inferMaterials(prompt, category) {
  const base = ['Tapestry needle', 'Scissors'];
  if (category === 'Amigurumi') {
    return ['Cotton yarn', '3.5 mm hook', 'Polyfill stuffing', 'Safety eyes', ...base];
  }
  if (category === 'Accessory') {
    return ['Cotton yarn', '4.5 mm hook', ...base];
  }
  return ['Worsted weight yarn', '5.0 mm hook', ...base];
}

function inferHookSize(prompt, category) {
  if (category === 'Amigurumi') return '3.5 mm';
  if (prompt.includes('bulky')) return '6.0 mm';
  if (category === 'Accessory') return '4.5 mm';
  return '5.0 mm';
}

function inferYarnWeight(prompt, category) {
  if (category === 'Amigurumi') return 'DK or Cotton';
  if (prompt.includes('bulky')) return 'Bulky';
  return 'Worsted';
}

function inferTimeEstimate(difficulty, category) {
  if (category === 'Amigurumi') return difficulty === 'advanced' ? '6-8 hrs' : '3-5 hrs';
  if (category === 'Blanket') return '8+ hrs';
  return difficulty === 'advanced' ? '4-6 hrs' : '1-3 hrs';
}

function inferFinishedSize(category) {
  if (category === 'Amigurumi') return '6-10 in tall';
  if (category === 'Accessory') return 'Everyday carry size';
  if (category === 'Wearable') return 'One size';
  return 'Project dependent';
}

function inferNotes(category) {
  if (category === 'Amigurumi') {
    return ['Work in tight stitches and stuff firmly as you go.'];
  }
  if (category === 'Accessory') {
    return ['Check handle or strap tension before finishing.'];
  }
  return ['Swatch first if you need precise sizing.'];
}
