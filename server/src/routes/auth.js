import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findByUsername, findById, update } from '../models/users.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: true, message: 'Username und Passwort erforderlich' });
    }
    const user = await findByUsername(username);
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ error: true, message: 'Falsche Anmeldedaten' });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (err) { next(err); }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await findById(req.user.id);
    if (!user) return res.status(404).json({ error: true, message: 'Benutzer nicht gefunden' });
    res.json(user);
  } catch (err) { next(err); }
});

router.put('/password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: true, message: 'Neues Passwort muss mindestens 6 Zeichen haben' });
    }
    const user = await findByUsername(req.user.username);
    if (!await bcrypt.compare(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: true, message: 'Aktuelles Passwort falsch' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await update(req.user.id, { passwordHash });
    res.json({ message: 'Passwort geändert' });
  } catch (err) { next(err); }
});

export default router;
