import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import * as Claude from './claude.js';
import { createWebsiteBrief } from './openai.js';
import { analyzeUrl } from './webAnalyzer.js';
import { uniqueSubdomain } from '../utils/subdomain.js';
import { query } from '../db/index.js';
import * as Leads from '../models/leads.js';
import { getSetting } from '../models/settings.js';

const TEMPLATE_DIR = path.resolve(import.meta.dirname, '../../astro-template');
const BUILD_DIR = '/tmp/astro-builds';

function getTeaserPath() {
  return process.env.TEASER_FILES_PATH || '/var/www/teasers';
}

async function getTeaserDomain() {
  return (await getSetting('teaser_domain')) || process.env.TEASER_DOMAIN || 'webseiten-werkstatt.at';
}

async function fetchSubpages(mainUrl, mainHtml) {
  const cheerio = await import('cheerio');
  const axios = (await import('axios')).default;
  const $ = cheerio.load(mainHtml);
  const baseUrl = new URL(mainUrl);
  const subpageContents = [];
  const visited = new Set([baseUrl.pathname]);
  const links = [];

  $('nav a, header a, .nav a, .menu a, .navbar a').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    try {
      const url = new URL(href, mainUrl);
      if (url.hostname === baseUrl.hostname && !visited.has(url.pathname)) {
        visited.add(url.pathname);
        links.push({ url: url.href, text: $(el).text().trim() });
      }
    } catch {}
  });

  for (const link of links.slice(0, 8)) {
    try {
      const res = await axios.get(link.url, {
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WebhochBot/1.0)' },
        maxContentLength: 2 * 1024 * 1024,
      });
      if (typeof res.data === 'string') {
        const $sub = cheerio.load(res.data);
        const content = [];
        $sub('h1, h2, h3, h4').each((_, el) => content.push($sub(el).text().trim()));
        $sub('p, li, td, dd, address, .team-member, .member, .person, [class*="team"], [class*="member"], [class*="staff"], [class*="mitarbeiter"]').each((_, el) => {
          const t = $sub(el).text().trim();
          if (t && t.length > 10 && t.length < 500) content.push(t);
        });
        // Auch Bilder von Unterseiten sammeln
        const subImages = [];
        $sub('img').each((_, el) => {
          const src = $sub(el).attr('src') || $sub(el).attr('data-src');
          if (src) {
            try {
              const imgUrl = new URL(src, link.url).href;
              if (imgUrl.match(/\.(jpg|jpeg|png|webp)/i)) {
                subImages.push({ src: imgUrl, alt: $sub(el).attr('alt') || '' });
              }
            } catch {}
          }
        });
        subpageContents.push({
          title: link.text || $sub('title').text().trim(),
          url: link.url,
          content: [...new Set(content)].slice(0, 25).join('\n'),
          images: subImages.slice(0, 5),
        });
      }
    } catch {}
  }
  return subpageContents;
}

// Stelle sicher, dass das Astro-Template vorinstalliert ist
async function ensureTemplateReady() {
  const nodeModules = path.join(TEMPLATE_DIR, 'node_modules');
  if (!existsSync(nodeModules)) {
    console.log('Astro-Template: Installiere Dependencies...');
    execSync('npm install --production', { cwd: TEMPLATE_DIR, timeout: 120000, stdio: 'pipe' });
    console.log('Astro-Template: Dependencies installiert.');
  }
}

// Astro-Projekt bauen und deployen
async function buildAndDeploy(subdomain, astroContent, cssContent) {
  await ensureTemplateReady();

  const buildPath = path.join(BUILD_DIR, subdomain);

  // Build-Verzeichnis vorbereiten: Template kopieren
  await fs.rm(buildPath, { recursive: true, force: true });
  await fs.mkdir(buildPath, { recursive: true });

  // Package files kopieren
  await fs.copyFile(path.join(TEMPLATE_DIR, 'package.json'), path.join(buildPath, 'package.json'));
  await fs.copyFile(path.join(TEMPLATE_DIR, 'astro.config.mjs'), path.join(buildPath, 'astro.config.mjs'));
  await fs.copyFile(path.join(TEMPLATE_DIR, 'tsconfig.json'), path.join(buildPath, 'tsconfig.json'));

  // node_modules als Symlink (spart Zeit + Speicher)
  const templateModules = path.join(TEMPLATE_DIR, 'node_modules');
  const buildModules = path.join(buildPath, 'node_modules');
  await fs.symlink(templateModules, buildModules);

  // Layout kopieren
  await fs.mkdir(path.join(buildPath, 'src', 'layouts'), { recursive: true });
  await fs.copyFile(
    path.join(TEMPLATE_DIR, 'src', 'layouts', 'Layout.astro'),
    path.join(buildPath, 'src', 'layouts', 'Layout.astro')
  );

  // Claude-generierten Content schreiben
  await fs.mkdir(path.join(buildPath, 'src', 'pages'), { recursive: true });
  await fs.writeFile(path.join(buildPath, 'src', 'pages', 'index.astro'), astroContent, 'utf-8');

  if (cssContent) {
    await fs.mkdir(path.join(buildPath, 'src', 'styles'), { recursive: true });
    await fs.writeFile(path.join(buildPath, 'src', 'styles', 'global.css'), cssContent, 'utf-8');
  }

  // Astro Build
  console.log(`Astro Build: ${subdomain}...`);
  try {
    // Verwende den Astro-Binary direkt aus node_modules
    const astroBin = path.join(buildPath, 'node_modules', '.bin', 'astro');
    const result = execSync(`${astroBin} build`, {
      cwd: buildPath,
      timeout: 90000,
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'production', LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' },
    });
    console.log('Astro Build stdout:', result.toString().slice(-200));
  } catch (err) {
    const stderr = err.stderr?.toString() || '';
    const stdout = err.stdout?.toString() || '';
    console.error('Astro Build Fehler stderr:', stderr.slice(0, 500));
    console.error('Astro Build Fehler stdout:', stdout.slice(0, 500));
    // Fallback: Astro-Content als rohes HTML deployen
    console.log('Fallback: Deploye als HTML...');
    await deployHtml(subdomain, astroContent);
    return;
  }

  // Built files zum Teaser-Verzeichnis kopieren
  const distPath = path.join(buildPath, 'dist');
  const deployPath = path.join(getTeaserPath(), subdomain);
  await fs.rm(deployPath, { recursive: true, force: true });
  await fs.cp(distPath, deployPath, { recursive: true });

  // Build-Verzeichnis aufräumen (Symlink zuerst entfernen)
  await fs.unlink(buildModules).catch(() => {});
  await fs.rm(buildPath, { recursive: true, force: true });

  console.log(`Astro Deploy: ${subdomain} fertig.`);
}

// Fallback: Astro-Content als HTML deployen wenn der Build scheitert
async function deployHtml(subdomain, astroSource) {
  const deployPath = path.join(getTeaserPath(), subdomain);
  await fs.mkdir(deployPath, { recursive: true });

  let finalHtml = astroSource;

  if (astroSource.includes('---') && astroSource.includes('Layout')) {
    // Astro Frontmatter und Layout-Tags entfernen
    const bodyMatch = astroSource.match(/<Layout[\s\S]*?>([\s\S]*)<\/Layout>/);
    const styleMatch = astroSource.match(/<style>([\s\S]*?)<\/style>/);
    const body = bodyMatch ? bodyMatch[1] : astroSource;
    const styles = styleMatch ? styleMatch[1] : '';

    finalHtml = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="https://webhoch.com/favicon.ico">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { font-family: 'Inter', system-ui, sans-serif; color: #1e293b; line-height: 1.75; -webkit-font-smoothing: antialiased; }
img { max-width: 100%; height: auto; display: block; }
a { color: inherit; text-decoration: none; }
.webhoch-banner { position: fixed; top: 0; left: 0; right: 0; z-index: 9999; background: linear-gradient(135deg, #fd71ba, #87d0ec); padding: 0.5rem 1rem; }
.webhoch-banner-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: center; gap: 1rem; }
.webhoch-banner-text { color: white; font-size: 0.85rem; font-weight: 500; }
.webhoch-banner-link { color: white !important; font-weight: 700; }
.webhoch-banner-btn { display: inline-block; background: rgba(255,255,255,0.95); color: #1a1a2e !important; font-size: 0.75rem; font-weight: 600; padding: 0.3rem 0.9rem; border-radius: 9999px; }
${styles}
</style>
</head>
<body>
<div class="webhoch-banner"><div class="webhoch-banner-inner"><span class="webhoch-banner-text">Dies ist ein unverbindlicher Entwurf von <a href="https://webhoch.com" class="webhoch-banner-link"><span style="font-weight:800">webhoch</span>.com</a></span><a href="https://webhoch.com" class="webhoch-banner-btn">Mehr erfahren</a></div></div>
<div style="padding-top:3rem">
${body}
</div>
</body>
</html>`;
  }

  await fs.writeFile(path.join(deployPath, 'index.html'), finalHtml, 'utf-8');
}

export async function generate(leadId, designWishes) {
  const lead = await Leads.findById(leadId);
  if (!lead) throw new Error('Lead nicht gefunden');

  console.log(`Teaser generieren für: ${lead.name} (${lead.url})`);

  // 1. Website analysieren
  const webData = await analyzeUrl(lead.url);

  // 2. Unterseiten analysieren (bis zu 8 Seiten)
  let subpageInfo = '';
  let subpageImages = [];
  try {
    const subpages = await fetchSubpages(lead.url, webData.html);
    if (subpages.length > 0) {
      subpageInfo = '\n\nUnterseiten:\n' +
        subpages.map(s => `--- ${s.title} ---\n${s.content}`).join('\n\n');
      // Bilder von Unterseiten sammeln
      for (const sp of subpages) {
        if (sp.images) subpageImages.push(...sp.images);
      }
    }
  } catch {}

  // 3. Strukturierte Website-Zusammenfassung erstellen
  let websiteSummary = `Firmenname: ${lead.name || webData.title}\n`;
  websiteSummary += `URL: ${lead.url}\n`;
  websiteSummary += `Branche: ${lead.branche || 'nicht angegeben'}\n`;
  if (webData.title) websiteSummary += `Seitentitel: ${webData.title}\n`;
  if (webData.metaDescText) websiteSummary += `Meta-Beschreibung: ${webData.metaDescText}\n`;
  if (webData.h1Text) websiteSummary += `H1: ${webData.h1Text}\n`;
  if (webData.navLinks?.length) websiteSummary += `Navigation: ${[...new Set(webData.navLinks)].join(', ')}\n`;
  if (webData.contact?.phones?.length) websiteSummary += `Telefon: ${webData.contact.phones.join(', ')}\n`;
  if (webData.contact?.emails?.length) websiteSummary += `Email: ${webData.contact.emails.join(', ')}\n`;
  if (webData.contact?.addresses?.length) websiteSummary += `Adresse: ${webData.contact.addresses.join(' | ')}\n`;
  if (webData.logoUrl) websiteSummary += `Logo-URL: ${webData.logoUrl}\n`;
  if (webData.images?.length || subpageImages.length) {
    const allImages = [...(webData.images || []), ...subpageImages];
    const seenUrls = new Set();
    const uniqueImgs = allImages.filter(i => {
      if (i.src === webData.logoUrl || seenUrls.has(i.src)) return false;
      seenUrls.add(i.src);
      return true;
    }).slice(0, 15);
    websiteSummary += `Bilder (alle verfügbar, MUSS verwendet werden):\n${uniqueImgs.map(i => `  - ${i.src} (${i.alt || 'kein Alt'})`).join('\n')}\n`;
  }
  if (webData.colors?.length) websiteSummary += `CSS-Farben: ${webData.colors.join(', ')}\n`;
  if (webData.headings?.length) websiteSummary += `Überschriften: ${webData.headings.join(' | ')}\n`;
  if (webData.paragraphs?.length) websiteSummary += `Texte:\n${webData.paragraphs.join('\n')}\n`;
  if (subpageInfo) websiteSummary += subpageInfo;
  if (designWishes) websiteSummary += `\nDesign-Wünsche: ${designWishes}\n`;
  if (lead.suggestions) websiteSummary += `\nVerbesserungsvorschläge: ${lead.suggestions}\n`;

  // 4. SCHRITT 1: OpenAI (GPT) erstellt das Design-Brief
  console.log('Schritt 1: OpenAI erstellt Design-Brief...');
  let brief;
  try {
    brief = await createWebsiteBrief(websiteSummary);
  } catch (err) {
    console.error('OpenAI Fehler, fahre ohne Brief fort:', err.message);
    brief = null;
  }

  // OpenAI Kosten schätzen (GPT-4.1: ~$2/M input, ~$8/M output, ca. 2000 input + 2000 output tokens)
  const openaiCostEstimate = brief ? 0.02 : 0;

  // 5. SCHRITT 2: Claude baut den Astro-Code basierend auf dem Brief
  console.log('Schritt 2: Claude generiert Astro-Code...');
  const briefText = brief ? JSON.stringify(brief, null, 2) : websiteSummary;
  const subdomain = await uniqueSubdomain(lead.name || lead.url);
  const { astroContent, cost: claudeCost } = await Claude.generateTeaser(lead, briefText, designWishes);
  const cost = claudeCost + openaiCostEstimate;

  // Astro bauen und deployen
  await buildAndDeploy(subdomain, astroContent);

  const domain = await getTeaserDomain();
  const teaserUrl = `https://${subdomain}.${domain}`;

  // Für Preview und Änderungen speichern wir den Astro-Source
  const totalCost = parseFloat(lead.analysis_cost || 0) + cost;
  await Leads.update(leadId, {
    teaser_subdomain: subdomain,
    teaser_html: astroContent,
    teaser_cost: cost,
    total_cost: totalCost,
    status: 'teaser_generated',
    design_wishes: designWishes || lead.design_wishes,
  });

  return { teaserUrl, subdomain, cost };
}

export async function modify(leadId, changeRequest, userId) {
  const lead = await Leads.findById(leadId);
  if (!lead || !lead.teaser_html) throw new Error('Kein Teaser vorhanden');

  const insertResult = await query(
    'INSERT INTO teaser_changes (lead_id, change_request, html_before, user_id) VALUES ($1, $2, $3, $4) RETURNING id',
    [leadId, changeRequest, lead.teaser_html, userId]
  );
  const changeId = insertResult.rows[0].id;

  const { html: astroContent, cost } = await Claude.modifyTeaser(lead.teaser_html, changeRequest);

  // Neu bauen und deployen
  await buildAndDeploy(lead.teaser_subdomain, astroContent);

  const totalCost = parseFloat(lead.total_cost || 0) + cost;
  await Leads.update(leadId, {
    teaser_html: astroContent,
    teaser_cost: parseFloat(lead.teaser_cost || 0) + cost,
    total_cost: totalCost,
  });

  await query(
    'UPDATE teaser_changes SET html_after = $1, cost = $2 WHERE id = $3',
    [astroContent, cost, changeId]
  );

  return { html: astroContent, cost };
}

export async function deploy(subdomain, html) {
  await buildAndDeploy(subdomain, html);
}

export async function undeploy(subdomain) {
  const dir = path.join(getTeaserPath(), subdomain);
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {}
}

export async function getChanges(leadId) {
  const { rows } = await query(
    'SELECT id, change_request, cost, created_at, user_id FROM teaser_changes WHERE lead_id = $1 ORDER BY created_at DESC',
    [leadId]
  );
  return rows;
}
