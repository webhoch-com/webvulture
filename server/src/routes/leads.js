import { Router } from 'express';
import * as Leads from '../models/leads.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const result = await Leads.findAll(req.query);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const lead = await Leads.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: true, message: 'Lead nicht gefunden' });
    res.json(lead);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const allowedFields = ['name', 'email', 'phone', 'design_wishes', 'status', 'branche'];
    const fields = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) fields[key] = req.body[key];
    }
    const lead = await Leads.update(req.params.id, fields);
    if (!lead) return res.status(404).json({ error: true, message: 'Lead nicht gefunden' });
    res.json(lead);
  } catch (err) { next(err); }
});

router.put('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const lead = await Leads.updateStatus(req.params.id, status);
    if (!lead) return res.status(404).json({ error: true, message: 'Lead nicht gefunden' });
    res.json(lead);
  } catch (err) { next(err); }
});

router.post('/bulk-action', async (req, res, next) => {
  try {
    const { ids, status } = req.body;
    if (!ids?.length || !status) {
      return res.status(400).json({ error: true, message: 'IDs und Status erforderlich' });
    }
    const updated = await Leads.bulkUpdateStatus(ids, status);
    res.json({ updated: updated.length });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await Leads.remove(req.params.id);
    res.json({ message: 'Lead geloescht' });
  } catch (err) { next(err); }
});

export default router;
