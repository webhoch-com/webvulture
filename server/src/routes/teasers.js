import { Router } from 'express';
import * as TeaserService from '../services/teaserService.js';
import * as Claude from '../services/claude.js';
import * as Leads from '../models/leads.js';
import { archiveLead, restoreLead } from '../services/archiveService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.post('/:id/teaser', async (req, res, next) => {
  try {
    const { designWishes } = req.body;
    const result = await TeaserService.generate(parseInt(req.params.id), designWishes);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id/teaser/preview', async (req, res, next) => {
  try {
    const lead = await Leads.findById(req.params.id);
    if (!lead || !lead.teaser_html) {
      return res.status(404).json({ error: true, message: 'Kein Teaser vorhanden' });
    }
    res.type('html').send(lead.teaser_html);
  } catch (err) { next(err); }
});

router.post('/:id/teaser/change', async (req, res, next) => {
  try {
    const { changeRequest } = req.body;
    if (!changeRequest) {
      return res.status(400).json({ error: true, message: 'Aenderungswunsch erforderlich' });
    }
    const result = await TeaserService.modify(parseInt(req.params.id), changeRequest, req.user.id);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id/teaser/changes', async (req, res, next) => {
  try {
    const changes = await TeaserService.getChanges(parseInt(req.params.id));
    res.json(changes);
  } catch (err) { next(err); }
});

router.post('/:id/email', async (req, res, next) => {
  try {
    const lead = await Leads.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: true, message: 'Lead nicht gefunden' });

    const domain = process.env.TEASER_DOMAIN || 'webseiten-werkstatt.at';
    const teaserUrl = lead.teaser_subdomain ? `https://${lead.teaser_subdomain}.${domain}` : '';
    const { emailText, cost } = await Claude.generateEmail(lead, teaserUrl);

    const totalCost = parseFloat(lead.total_cost || 0) + cost;
    await Leads.update(lead.id, {
      email_text: emailText,
      email_cost: cost,
      total_cost: totalCost,
      status: lead.status === 'teaser_generated' ? 'email_generated' : lead.status,
    });

    res.json({ emailText, cost });
  } catch (err) { next(err); }
});

router.post('/:id/email/regenerate', async (req, res, next) => {
  try {
    const lead = await Leads.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: true, message: 'Lead nicht gefunden' });

    const domain = process.env.TEASER_DOMAIN || 'webseiten-werkstatt.at';
    const teaserUrl = lead.teaser_subdomain ? `https://${lead.teaser_subdomain}.${domain}` : '';
    const { emailText, cost } = await Claude.generateEmail(lead, teaserUrl);

    const totalCost = parseFloat(lead.total_cost || 0) + cost;
    await Leads.update(lead.id, {
      email_text: emailText,
      email_cost: parseFloat(lead.email_cost || 0) + cost,
      total_cost: totalCost,
    });

    res.json({ emailText, cost });
  } catch (err) { next(err); }
});

router.post('/:id/archive', async (req, res, next) => {
  try {
    const result = await archiveLead(parseInt(req.params.id));
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/:id/restore', async (req, res, next) => {
  try {
    const result = await restoreLead(parseInt(req.params.id));
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
