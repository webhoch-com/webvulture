import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import settingsRoutes from './routes/settings.js';
import searchRoutes from './routes/search.js';
import leadRoutes from './routes/leads.js';
import teaserRoutes from './routes/teasers.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Preview routes (token via query param for iframe support, must be before authenticated leads routes)
import jwt from 'jsonwebtoken';
import axios from 'axios';
import * as LeadsModel from './models/leads.js';
import { query } from './db/index.js';

app.get('/api/leads/:id/original-preview', async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(401).send('Nicht authentifiziert');
    jwt.verify(token, process.env.JWT_SECRET);
    const lead = await LeadsModel.findById(req.params.id);
    if (!lead) return res.status(404).send('Lead nicht gefunden');
    const response = await axios.get(lead.url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WebhochBot/1.0)' },
      maxContentLength: 5 * 1024 * 1024,
    });
    let html = typeof response.data === 'string' ? response.data : '';
    const baseUrl = new URL(lead.url);
    html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${baseUrl.origin}/">`);
    res.type('html').send(html);
  } catch {
    res.status(502).send('<html><body style="font-family:sans-serif;padding:40px;color:#666;text-align:center"><h2>Website nicht erreichbar</h2></body></html>');
  }
});

import fs from 'fs';
app.get('/api/leads/:id/teaser/preview', async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(401).send('Nicht authentifiziert');
    jwt.verify(token, process.env.JWT_SECRET);
    const lead = await LeadsModel.findById(req.params.id);
    if (!lead || !lead.teaser_subdomain) return res.status(404).send('Kein Teaser vorhanden');

    // Gebautes HTML aus dem Teaser-Verzeichnis lesen und CSS inlinen
    const teaserPath = process.env.TEASER_FILES_PATH || '/var/www/teasers';
    const teaserDir = `${teaserPath}/${lead.teaser_subdomain}`;
    const htmlPath = `${teaserDir}/index.html`;
    if (fs.existsSync(htmlPath)) {
      let html = fs.readFileSync(htmlPath, 'utf-8');
      // CSS-Links durch inline <style> ersetzen (für iframe-Preview)
      const cssLinkRegex = /<link\s+rel="stylesheet"\s+href="([^"]+)"\s*\/?>/g;
      let match;
      while ((match = cssLinkRegex.exec(html)) !== null) {
        const cssHref = match[1];
        const cssPath = `${teaserDir}${cssHref.startsWith('/') ? '' : '/'}${cssHref}`;
        if (fs.existsSync(cssPath)) {
          const css = fs.readFileSync(cssPath, 'utf-8');
          html = html.replace(match[0], `<style>${css}</style>`);
        }
      }
      res.type('html').send(html);
    } else {
      res.status(404).send('Teaser-Dateien nicht gefunden');
    }
  } catch {
    res.status(401).send('Token ungültig');
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/leads', teaserRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'webhoch Webseiten Vorschau', timestamp: new Date().toISOString() });
});

// Server stats (for dashboard widget)
import os from 'os';
import { authenticate as authCheck } from './middleware/auth.js';
app.get('/api/stats/server', authCheck, async (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const cpus = os.cpus();
  const cpuLoad = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;
    return acc + ((total - idle) / total);
  }, 0) / cpus.length;
  const uptime = os.uptime();

  // Disk usage from teaser path
  let diskInfo = { total: 0, used: 0, free: 0 };
  try {
    const { execSync } = await import('child_process');
    const df = execSync("df -B1 / | tail -1").toString().trim().split(/\s+/);
    diskInfo = { total: parseInt(df[1]) || 0, used: parseInt(df[2]) || 0, free: parseInt(df[3]) || 0 };
  } catch {}

  // Lead stats
  const leadStats = await query('SELECT status, COUNT(*) as count FROM leads GROUP BY status');
  const totalLeads = await query('SELECT COUNT(*) as count FROM leads');
  const totalCosts = await query('SELECT COALESCE(SUM(total_cost), 0) as total FROM leads');

  res.json({
    cpu: { usage: Math.round(cpuLoad * 100), cores: cpus.length },
    memory: { total: totalMem, used: usedMem, free: freeMem, percent: Math.round((usedMem / totalMem) * 100) },
    disk: { ...diskInfo, percent: diskInfo.total ? Math.round((diskInfo.used / diskInfo.total) * 100) : 0 },
    uptime,
    leads: {
      total: parseInt(totalLeads.rows[0]?.count || 0),
      byStatus: Object.fromEntries(leadStats.rows.map(r => [r.status, parseInt(r.count)])),
      totalCosts: parseFloat(totalCosts.rows[0]?.total || 0),
    },
  });
});

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`webhoch Webseiten Vorschau Server laeuft auf Port ${PORT}`);
});

export default app;
