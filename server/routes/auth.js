import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/users', (req, res) => {
  const users = db.prepare("SELECT id, name, email, department, role, managerId, avatar FROM users ORDER BY role, name").all();
  res.json(users);
});

router.get('/users/:role', (req, res) => {
  const users = db.prepare("SELECT id, name, email, department, role, managerId, avatar FROM users WHERE role = ? ORDER BY name").all(req.params.role);
  res.json(users);
});

router.post('/login', (req, res) => {
  const { userId, email, password } = req.body;

  if (email && password) {
    const user = db.prepare("SELECT id, name, email, department, role, managerId, avatar FROM users WHERE email = ?").get(email);
    if (!user) return res.status(401).json({ error: 'Invalid email address' });
    const full = db.prepare("SELECT password FROM users WHERE email = ?").get(email);
    if (full.password !== password) return res.status(401).json({ error: 'Invalid password' });
    return res.json(user);
  }

  if (userId) {
    const user = db.prepare("SELECT id, name, email, department, role, managerId, avatar FROM users WHERE id = ?").get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  }

  res.status(400).json({ error: 'Email and password are required' });
});

router.get('/user/:id', (req, res) => {
  const user = db.prepare("SELECT id, name, email, department, role, managerId, avatar FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.get('/team/:managerId', (req, res) => {
  const team = db.prepare("SELECT id, name, email, department, role, managerId, avatar FROM users WHERE managerId = ? ORDER BY name").all(req.params.managerId);
  res.json(team);
});

export default router;
