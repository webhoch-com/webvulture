import Anthropic from '@anthropic-ai/sdk';
import { getSetting } from '../models/settings.js';
import { calculateCost } from '../utils/costCalculator.js';
import { SEARCH_TERMS_PROMPT } from '../prompts/searchTerms.js';
import { WEBSITE_ANALYSIS_PROMPT } from '../prompts/websiteAnalysis.js';
import { TEASER_GENERATION_PROMPT } from '../prompts/teaserGeneration.js';
import { TEASER_MODIFICATION_PROMPT } from '../prompts/teaserModification.js';
import { EMAIL_GENERATION_PROMPT } from '../prompts/emailGeneration.js';
import { FOLLOW_UP_EMAIL_PROMPT } from '../prompts/followUpEmail.js';

async function getClient() {
  const apiKey = await getSetting('anthropic_api_key');
  if (!apiKey) throw new Error('Anthropic API Key nicht konfiguriert. Bitte unter Einstellungen hinterlegen.');
  return new Anthropic({ apiKey });
}

async function getModel() {
  return (await getSetting('default_ai_model')) || 'claude-opus-4-6';
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

  const { text, cost, usage } = await callClaude(WEBSITE_ANALYSIS_PROMPT, userMsg, 3000);
  try {
    // JSON aus Markdown-Codeblock extrahieren falls nötig
    let jsonStr = text;
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (codeBlockMatch) jsonStr = codeBlockMatch[1];
    const analysis = JSON.parse(jsonStr.trim());
    return { analysis, cost, usage };
  } catch (parseErr) {
    console.error('JSON Parse Fehler bei Analyse:', parseErr.message, text.slice(0, 200));
    return {
      analysis: { rating: 2, suggestions: text, name: '', email: '', summary: text },
      cost,
      usage,
    };
  }
}

export async function generateTeaser(leadData, originalHtml, designWishes) {
  const prompt = TEASER_GENERATION_PROMPT(leadData, designWishes);
  const userMsg = `Originalwebsite HTML:\n${originalHtml.slice(0, 18000)}`;
  const { text, cost } = await callClaude(prompt, userMsg, 12000);
  // Astro-Content extrahieren (beginnt mit --- oder enthält Layout import)
  let astroContent = text;
  // Falls in Markdown-Codeblock verpackt
  const codeBlockMatch = text.match(/```astro\n([\s\S]*?)```/) || text.match(/```\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    astroContent = codeBlockMatch[1];
  }
  // Falls ein HTML-Dokument zurückkommt statt Astro, trotzdem verwenden (Fallback)
  return { astroContent, cost };
}

export async function modifyTeaser(currentHtml, changeRequest) {
  const userMsg = `Aktuelle Astro-Datei:\n${currentHtml}\n\nÄnderungswunsch:\n${changeRequest}`;
  const { text, cost } = await callClaude(TEASER_MODIFICATION_PROMPT, userMsg, 12000);
  let astroContent = text;
  const codeBlockMatch = text.match(/```astro\n([\s\S]*?)```/) || text.match(/```\n([\s\S]*?)```/);
  if (codeBlockMatch) astroContent = codeBlockMatch[1];
  return { html: astroContent, cost };
}

export async function generateEmail(leadData, teaserUrl) {
  const prompt = EMAIL_GENERATION_PROMPT(leadData, teaserUrl);
  const { text, cost } = await callClaude(prompt, 'Erstelle die Email.', 2048);
  return { emailText: text, cost };
}

export async function generateFollowUpEmail(leadData, teaserUrl, followUpNumber, daysSinceContact) {
  const prompt = FOLLOW_UP_EMAIL_PROMPT(leadData, teaserUrl, followUpNumber, daysSinceContact);
  const { text, cost } = await callClaude(prompt, 'Erstelle die Follow-up Email.', 2048);
  return { emailText: text, cost };
}
