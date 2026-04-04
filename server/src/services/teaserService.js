import fs from 'fs/promises';
import path from 'path';
import * as Claude from './claude.js';
import { analyzeUrl } from './webAnalyzer.js';
import { uniqueSubdomain } from '../utils/subdomain.js';
import * as Leads from '../models/leads.js';
import { getSetting } from '../models/settings.js';

function getTeaserPath() {
  return process.env.TEASER_FILES_PATH || '/var/www/teasers';
}

async function getTeaserDomain() {
  return (await getSetting('teaser_domain')) || process.env.TEASER_DOMAIN || 'webseiten-werkstatt.at';
}

export async function generate(leadId, designWishes) {
  const lead = await Leads.findById(leadId);
  if (!lead) throw new Error('Lead nicht gefunden');

  const webData = await analyzeUrl(lead.url);
  const subdomain = await uniqueSubdomain(lead.name || lead.url);
  const { html, cost } = await Claude.generateTeaser(lead, webData.html, designWishes);

  await deploy(subdomain, html);

  const domain = await getTeaserDomain();
  const teaserUrl = `https://${subdomain}.${domain}`;

  const totalCost = parseFloat(lead.analysis_cost || 0) + cost;
  await Leads.update(leadId, {
    teaser_subdomain: subdomain,
    teaser_html: html,
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

  const { query } = await import('../db/index.js');
  await query(
    'INSERT INTO teaser_changes (lead_id, change_request, html_before, user_id) VALUES ($1, $2, $3, $4)',
    [leadId, changeRequest, lead.teaser_html, userId]
  );

  const { html, cost } = await Claude.modifyTeaser(lead.teaser_html, changeRequest);

  await deploy(lead.teaser_subdomain, html);

  const totalCost = parseFloat(lead.total_cost || 0) + cost;
  await Leads.update(leadId, {
    teaser_html: html,
    teaser_cost: parseFloat(lead.teaser_cost || 0) + cost,
    total_cost: totalCost,
  });

  const changeResult = await query(
    'UPDATE teaser_changes SET html_after = $1, cost = $2 WHERE lead_id = $3 AND html_after IS NULL ORDER BY created_at DESC LIMIT 1 RETURNING *',
    [html, cost, leadId]
  );

  return { html, cost, change: changeResult.rows[0] };
}

export async function deploy(subdomain, html) {
  const basePath = getTeaserPath();
  const dir = path.join(basePath, subdomain);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'index.html'), html, 'utf-8');
}

export async function undeploy(subdomain) {
  const basePath = getTeaserPath();
  const dir = path.join(basePath, subdomain);
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // directory may not exist
  }
}

export async function getChanges(leadId) {
  const { query } = await import('../db/index.js');
  const { rows } = await query(
    'SELECT id, change_request, cost, created_at, user_id FROM teaser_changes WHERE lead_id = $1 ORDER BY created_at DESC',
    [leadId]
  );
  return rows;
}
