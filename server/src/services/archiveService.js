import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import archiver from 'archiver';
import * as Leads from '../models/leads.js';
import { undeploy } from './teaserService.js';

function getArchivePath() {
  return path.join(process.env.TEASER_FILES_PATH || '/var/www/teasers', '_archives');
}

export async function archiveLead(leadId) {
  const lead = await Leads.findById(leadId);
  if (!lead) throw new Error('Lead nicht gefunden');
  if (!lead.teaser_subdomain) throw new Error('Kein Teaser vorhanden');

  const archiveDir = getArchivePath();
  await fs.mkdir(archiveDir, { recursive: true });

  const teaserDir = path.join(process.env.TEASER_FILES_PATH || '/var/www/teasers', lead.teaser_subdomain);
  const zipPath = path.join(archiveDir, `${lead.id}-${lead.teaser_subdomain}.zip`);

  await new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(teaserDir, false);
    archive.finalize();
  });

  await undeploy(lead.teaser_subdomain);
  await Leads.update(leadId, { status: 'archived' });

  return { archivePath: zipPath };
}

export async function restoreLead(leadId) {
  const lead = await Leads.findById(leadId);
  if (!lead || !lead.teaser_html || !lead.teaser_subdomain) {
    throw new Error('Lead oder Teaser-Daten nicht vorhanden');
  }

  const { deploy } = await import('./teaserService.js');
  await deploy(lead.teaser_subdomain, lead.teaser_html);
  await Leads.update(leadId, { status: 'teaser_generated' });

  return { message: 'Teaser wiederhergestellt' };
}
