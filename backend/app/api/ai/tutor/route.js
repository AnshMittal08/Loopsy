import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getPatternById } from "@/lib/models/patternModel";

export async function POST(request) {
  try {
    const { user, response } = requireAuthenticatedUser(request);
    if (response) return response;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "AI Tutor requires an Anthropic API key.", code: "NO_API_KEY" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { patternId, currentStepIndex, userMessage, history } = body;

    if (!patternId || !userMessage) {
      return NextResponse.json(
        { error: "patternId and userMessage are required." },
        { status: 400 }
      );
    }

    const pattern = getPatternById(patternId, user.id);
    if (!pattern) {
      return NextResponse.json({ error: "Pattern not found." }, { status: 404 });
    }

    const steps = pattern.steps || [];
    const stepIndex = typeof currentStepIndex === "number" ? currentStepIndex : 0;
    const currentStep = steps[stepIndex];

    const systemPrompt = `You are a friendly crochet coach helping a ${pattern.difficulty || "beginner"} crocheter work through "${pattern.title}".
The user is on step ${stepIndex + 1} of ${steps.length}: "${currentStep?.instruction ?? "finished"}".
Full pattern context:
${steps.map((s, i) => `Step ${i + 1}: ${s.instruction}`).join("\n")}
Materials: ${(pattern.materials || []).join(", ")}.
Answer conversationally in 2–4 sentences. Focus on the specific step they're on. No markdown.`;

    const messages = [
      ...((history || []).slice(-6)),
      { role: "user", content: userMessage },
    ];

    const client = new Anthropic();
    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: systemPrompt,
      messages,
    });

    return NextResponse.json({ reply: resp.content[0].text });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get tutor response.", details: error.message },
      { status: 500 }
    );
  }
}
