import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY role, name').all();
  res.json(users);
});

router.get('/users/:role', (req, res) => {
  const users = db.prepare('SELECT * FROM users WHERE role = ? ORDER BY name').all(req.params.role);
  res.json(users);
});

router.post('/login', (req, res) => {
  const { userId } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.get('/user/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.get('/team/:managerId', (req, res) => {
  const team = db.prepare('SELECT * FROM users WHERE managerId = ? ORDER BY name').all(req.params.managerId);
  res.json(team);
});

export default router;
