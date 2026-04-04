import { Router } from 'express';
import { startSearch } from '../controllers/searchController.js';
import * as SearchJobs from '../models/searchJobs.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.post('/', startSearch);

router.get('/jobs', async (req, res, next) => {
  try {
    const jobs = await SearchJobs.findAll();
    res.json(jobs);
  } catch (err) { next(err); }
});

router.get('/jobs/:id', async (req, res, next) => {
  try {
    const job = await SearchJobs.findById(req.params.id);
    if (!job) return res.status(404).json({ error: true, message: 'Job nicht gefunden' });
    res.json(job);
  } catch (err) { next(err); }
});

export default router;
