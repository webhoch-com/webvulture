import { Router } from 'express';
import bcrypt from 'bcryptjs';
import * as Users from '../models/users.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const users = await Users.findAll();
    res.json(users);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: true, message: 'Username, Email und Passwort erforderlich' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await Users.create({ username, email, passwordHash, role });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: true, message: 'Username oder Email bereits vergeben' });
    }
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { username, email, role, password } = req.body;
    const fields = {};
    if (username) fields.username = username;
    if (email) fields.email = email;
    if (role) fields.role = role;
    if (password) fields.passwordHash = await bcrypt.hash(password, 12);
    const user = await Users.update(req.params.id, fields);
    if (!user) return res.status(404).json({ error: true, message: 'Benutzer nicht gefunden' });
    res.json(user);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: true, message: 'Eigenen Account nicht löschbar' });
    }
    await Users.remove(req.params.id);
    res.json({ message: 'Benutzer geloescht' });
  } catch (err) { next(err); }
});

export default router;
