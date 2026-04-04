import { Router } from 'express';
import * as Settings from '../models/settings.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireAdmin);

const ENCRYPTED_KEYS = ['anthropic_api_key', 'google_places_api_key'];

router.get('/', async (req, res, next) => {
  try {
    const settings = await Settings.getAllSettings();
    res.json(settings);
  } catch (err) { next(err); }
});

router.put('/:key', async (req, res, next) => {
  try {
    const { value } = req.body;
    if (value === undefined) {
      return res.status(400).json({ error: true, message: 'Wert erforderlich' });
    }
    const isEncrypted = ENCRYPTED_KEYS.includes(req.params.key);
    await Settings.setSetting(req.params.key, value, isEncrypted);
    res.json({ message: 'Einstellung gespeichert' });
  } catch (err) { next(err); }
});

export default router;
