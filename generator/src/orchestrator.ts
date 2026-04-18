import Anthropic from '@anthropic-ai/sdk';
import type { RebuildPackage, SiteSpec } from './types.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert web designer and copywriter.
Given a business's information, generate a complete site specification JSON that will be used to build a professional Astro website.
The spec must be realistic, compelling, and tailored to the business's niche and tone.
Return ONLY valid JSON matching the SiteSpec schema — no markdown, no explanation.`;

function buildUserPrompt(pkg: RebuildPackage): string {
  return `Generate a SiteSpec for this business:

Business:
${JSON.stringify(pkg.business, null, 2)}

Enrichment hints:
${JSON.stringify(pkg.generation_params ?? {}, null, 2)}

Extracted website content:
${JSON.stringify(pkg.extracted, null, 2)}

Brand colors: ${pkg.brand_colors?.join(', ') ?? 'none detected'}

IMPORTANT: Return only the JSON object, no other text.
Schema to fill:
{
  "business_name": string,
  "tagline": string,
  "hero": { "headline": string, "subheadline": string, "cta_text": string },
  "about": { "body": string },
  "services": [{ "name": string, "description": string, "icon": string }],
  "testimonials": [{ "quote": string, "author": string }],
  "contact": { "phone": string, "email": string, "address": string, "cta_text": string },
  "footer": { "tagline": string },
  "brand": { "primary_color": string, "font_style": "modern"|"classic"|"friendly"|"bold", "tone": string }
}`;
}

export interface OrchestrationResult {
  siteSpec: SiteSpec;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
}

export async function orchestrate(pkg: RebuildPackage): Promise<OrchestrationResult> {
  const model = process.env.GENERATION_MODEL ?? 'claude-sonnet-4-5';

  const message = await client.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(pkg) }],
  });

  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');

  let siteSpec: SiteSpec;
  try {
    // Strip any accidental markdown fences
    const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    siteSpec = JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude returned invalid JSON: ${text.slice(0, 200)}`);
  }

  const inputTokens = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;

  // Sonnet: 300¢/MTok input, 1500¢/MTok output
  const inputCents = Math.round((inputTokens / 1_000_000) * 300);
  const outputCents = Math.round((outputTokens / 1_000_000) * 1500);

  return {
    siteSpec,
    model,
    inputTokens,
    outputTokens,
    costCents: inputCents + outputCents,
  };
}
