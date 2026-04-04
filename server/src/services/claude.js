import Anthropic from '@anthropic-ai/sdk';
import { getSetting } from '../models/settings.js';
import { calculateCost } from '../utils/costCalculator.js';
import { SEARCH_TERMS_PROMPT } from '../prompts/searchTerms.js';
import { WEBSITE_ANALYSIS_PROMPT } from '../prompts/websiteAnalysis.js';
import { TEASER_GENERATION_PROMPT } from '../prompts/teaserGeneration.js';
import { TEASER_MODIFICATION_PROMPT } from '../prompts/teaserModification.js';
import { EMAIL_GENERATION_PROMPT } from '../prompts/emailGeneration.js';

async function getClient() {
  const apiKey = await getSetting('anthropic_api_key');
  if (!apiKey) throw new Error('Anthropic API Key nicht konfiguriert. Bitte unter Einstellungen hinterlegen.');
  return new Anthropic({ apiKey });
}

async function getModel() {
  return (await getSetting('default_ai_model')) || 'claude-opus-4-20250514';
}

async function callClaude(systemPrompt, userMessage, maxTokens = 4096) {
  const client = await getClient();
  const model = await getModel();
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  const text = response.content[0]?.text || '';
  const cost = calculateCost(response.usage, model);
  return { text, cost, usage: response.usage };
}

export async function generateSearchTerms(targetGroup, region, count) {
  const userMsg = `Zielgruppe: ${targetGroup}\nRegion: ${region}\nAnzahl gewuenschte Ergebnisse: ${count}`;
  const { text, cost } = await callClaude(SEARCH_TERMS_PROMPT, userMsg, 1024);
  try {
    const terms = JSON.parse(text);
    return { terms: Array.isArray(terms) ? terms : [terms], cost };
  } catch {
    const lines = text.split('\n').filter(l => l.trim()).map(l => l.replace(/^[\d\-\.\)]+\s*/, '').trim());
    return { terms: lines, cost };
  }
}

export async function analyzeWebsite(url, htmlSnippet, technicalData) {
  const userMsg = `URL: ${url}
Technische Daten:
- SSL: ${technicalData.ssl ? 'Ja' : 'Nein'}
- Mobile-Responsive: ${technicalData.mobile ? 'Ja' : 'Nein'}
- Ladezeit: ${technicalData.speed}
- H1 vorhanden: ${technicalData.h1 ? 'Ja' : 'Nein'}
- Meta-Description: ${technicalData.metaDesc ? 'Ja' : 'Nein'}

HTML-Auszug (erste 3000 Zeichen):
${htmlSnippet.slice(0, 3000)}`;

  const { text, cost, usage } = await callClaude(WEBSITE_ANALYSIS_PROMPT, userMsg, 2048);
  try {
    const analysis = JSON.parse(text);
    return { analysis, cost, usage };
  } catch {
    return {
      analysis: { rating: 2, suggestions: text, name: '', email: '', summary: text },
      cost,
      usage,
    };
  }
}

export async function generateTeaser(leadData, originalHtml, designWishes) {
  const prompt = TEASER_GENERATION_PROMPT(leadData, designWishes);
  const userMsg = `Originalwebsite HTML:\n${originalHtml.slice(0, 15000)}`;
  const { text, cost } = await callClaude(prompt, userMsg, 8000);
  const htmlMatch = text.match(/<!DOCTYPE[\s\S]*<\/html>/i) || text.match(/<html[\s\S]*<\/html>/i);
  return { html: htmlMatch ? htmlMatch[0] : text, cost };
}

export async function modifyTeaser(currentHtml, changeRequest) {
  const userMsg = `Aktueller Teaser HTML:\n${currentHtml}\n\nAenderungswunsch:\n${changeRequest}`;
  const { text, cost } = await callClaude(TEASER_MODIFICATION_PROMPT, userMsg, 8000);
  const htmlMatch = text.match(/<!DOCTYPE[\s\S]*<\/html>/i) || text.match(/<html[\s\S]*<\/html>/i);
  return { html: htmlMatch ? htmlMatch[0] : text, cost };
}

export async function generateEmail(leadData, teaserUrl) {
  const prompt = EMAIL_GENERATION_PROMPT(leadData, teaserUrl);
  const { text, cost } = await callClaude(prompt, '', 2048);
  return { emailText: text, cost };
}
