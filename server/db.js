import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'portal.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      department TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('employee','manager','admin')),
      managerId TEXT,
      avatar TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cycles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      year INTEGER NOT NULL,
      goalSettingOpen TEXT,
      goalSettingClose TEXT,
      q1Open TEXT, q1Close TEXT,
      q2Open TEXT, q2Close TEXT,
      q3Open TEXT, q3Close TEXT,
      q4Open TEXT, q4Close TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','closed')),
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS goal_sheets (
      id TEXT PRIMARY KEY,
      employeeId TEXT NOT NULL,
      cycleId TEXT NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','submitted','approved','returned')),
      managerComments TEXT,
      submittedAt TEXT,
      approvedAt TEXT,
      returnedAt TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employeeId) REFERENCES users(id),
      FOREIGN KEY (cycleId) REFERENCES cycles(id)
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      goalSheetId TEXT NOT NULL,
      thrustArea TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      uom TEXT NOT NULL CHECK(uom IN ('numeric','percentage','timeline','zero')),
      uomDirection TEXT DEFAULT 'min' CHECK(uomDirection IN ('min','max')),
      target TEXT NOT NULL,
      weightage REAL NOT NULL CHECK(weightage >= 10),
      status TEXT DEFAULT 'not_started' CHECK(status IN ('not_started','on_track','completed')),
      isShared INTEGER DEFAULT 0,
      sharedOwnerId TEXT,
      sharedGoalId TEXT,
      lockedAt TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (goalSheetId) REFERENCES goal_sheets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      goalId TEXT NOT NULL,
      quarter TEXT NOT NULL CHECK(quarter IN ('Q1','Q2','Q3','Q4')),
      actual TEXT,
      score REAL,
      notes TEXT,
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (goalId) REFERENCES goals(id) ON DELETE CASCADE,
      UNIQUE(goalId, quarter)
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id TEXT PRIMARY KEY,
      goalSheetId TEXT NOT NULL,
      quarter TEXT NOT NULL CHECK(quarter IN ('Q1','Q2','Q3','Q4')),
      managerComment TEXT,
      employeeCompleted INTEGER DEFAULT 0,
      managerCompleted INTEGER DEFAULT 0,
      completedAt TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (goalSheetId) REFERENCES goal_sheets(id),
      UNIQUE(goalSheetId, quarter)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      entityType TEXT NOT NULL,
      entityId TEXT NOT NULL,
      action TEXT NOT NULL,
      changedBy TEXT NOT NULL,
      field TEXT,
      oldValue TEXT,
      newValue TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      isRead INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS escalation_rules (
      id TEXT PRIMARY KEY,
      triggerType TEXT NOT NULL,
      delayDays INTEGER NOT NULL DEFAULT 3,
      description TEXT,
      active INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shared_goal_templates (
      id TEXT PRIMARY KEY,
      createdBy TEXT NOT NULL,
      thrustArea TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      uom TEXT NOT NULL,
      uomDirection TEXT DEFAULT 'min',
      target TEXT NOT NULL,
      department TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (createdBy) REFERENCES users(id)
    );
  `);

  seedData();
}

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount > 0) return;

  const adminId = uuidv4();
  const mgr1Id = uuidv4();
  const mgr2Id = uuidv4();
  const emp1Id = uuidv4();
  const emp2Id = uuidv4();
  const emp3Id = uuidv4();
  const emp4Id = uuidv4();
  const emp5Id = uuidv4();
  const emp6Id = uuidv4();

  const insertUser = db.prepare(`INSERT INTO users (id, name, email, department, role, managerId, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)`);

  insertUser.run(adminId, 'Priya Sharma', 'priya.sharma@atomberg.com', 'HR', 'admin', null, '👩‍💼');
  insertUser.run(mgr1Id, 'Rajesh Kumar', 'rajesh.kumar@atomberg.com', 'Engineering', 'manager', adminId, '👨‍💻');
  insertUser.run(mgr2Id, 'Anita Desai', 'anita.desai@atomberg.com', 'Marketing', 'manager', adminId, '👩‍💻');
  insertUser.run(emp1Id, 'Arjun Patel', 'arjun.patel@atomberg.com', 'Engineering', 'employee', mgr1Id, '🧑‍🔬');
  insertUser.run(emp2Id, 'Sneha Reddy', 'sneha.reddy@atomberg.com', 'Engineering', 'employee', mgr1Id, '👩‍🔬');
  insertUser.run(emp3Id, 'Vikram Singh', 'vikram.singh@atomberg.com', 'Engineering', 'employee', mgr1Id, '🧑‍💻');
  insertUser.run(emp4Id, 'Meera Joshi', 'meera.joshi@atomberg.com', 'Marketing', 'employee', mgr2Id, '👩‍🎨');
  insertUser.run(emp5Id, 'Rohit Nair', 'rohit.nair@atomberg.com', 'Marketing', 'employee', mgr2Id, '🧑‍🎨');
  insertUser.run(emp6Id, 'Kavita Menon', 'kavita.menon@atomberg.com', 'Marketing', 'employee', mgr2Id, '👩‍🏫');

  const cycleId = uuidv4();
  db.prepare(`INSERT INTO cycles (id, name, year, goalSettingOpen, goalSettingClose, q1Open, q1Close, q2Open, q2Close, q3Open, q3Close, q4Open, q4Close, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    cycleId, 'FY 2025-26', 2025,
    '2025-05-01', '2025-05-31',
    '2025-07-01', '2025-07-31',
    '2025-10-01', '2025-10-31',
    '2026-01-01', '2026-01-31',
    '2026-03-01', '2026-04-30',
    'active'
  );

  const cycleId2 = uuidv4();
  db.prepare(`INSERT INTO cycles (id, name, year, goalSettingOpen, goalSettingClose, q1Open, q1Close, q2Open, q2Close, q3Open, q3Close, q4Open, q4Close, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    cycleId2, 'FY 2026-27', 2026,
    '2026-05-01', '2026-05-31',
    '2026-07-01', '2026-07-31',
    '2026-10-01', '2026-10-31',
    '2027-01-01', '2027-01-31',
    '2027-03-01', '2027-04-30',
    'active'
  );

  const gs1Id = uuidv4();
  db.prepare(`INSERT INTO goal_sheets (id, employeeId, cycleId, status, submittedAt) VALUES (?, ?, ?, 'submitted', datetime('now'))`).run(gs1Id, emp1Id, cycleId2);

  const insertGoal = db.prepare(`INSERT INTO goals (id, goalSheetId, thrustArea, title, description, uom, uomDirection, target, weightage, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  insertGoal.run(uuidv4(), gs1Id, 'Product Innovation', 'Launch BLDC Motor V3', 'Design and deliver the next-gen BLDC motor with 15% better efficiency', 'timeline', 'min', '2026-09-30', 30, 'not_started');
  insertGoal.run(uuidv4(), gs1Id, 'Operational Excellence', 'Reduce Manufacturing Defects', 'Bring defect rate below target threshold', 'percentage', 'max', '2', 25, 'not_started');
  insertGoal.run(uuidv4(), gs1Id, 'Energy Efficiency', 'Improve Energy Rating', 'Achieve 5-star BEE rating for 3 new SKUs', 'numeric', 'min', '3', 25, 'not_started');
  insertGoal.run(uuidv4(), gs1Id, 'Customer Experience', 'Zero Safety Incidents', 'Maintain zero safety incidents in the product testing lab', 'zero', 'min', '0', 20, 'not_started');

  db.prepare(`INSERT INTO escalation_rules (id, triggerType, delayDays, description, active) VALUES (?, ?, ?, ?, ?)`).run(uuidv4(), 'goal_not_submitted', 7, 'Employee has not submitted goals within 7 days of cycle open', 1);
  db.prepare(`INSERT INTO escalation_rules (id, triggerType, delayDays, description, active) VALUES (?, ?, ?, ?, ?)`).run(uuidv4(), 'goal_not_approved', 5, 'Manager has not approved goals within 5 days of submission', 1);
  db.prepare(`INSERT INTO escalation_rules (id, triggerType, delayDays, description, active) VALUES (?, ?, ?, ?, ?)`).run(uuidv4(), 'checkin_not_completed', 10, 'Quarterly check-in not completed within 10 days of window open', 1);

  const notify = db.prepare(`INSERT INTO notifications (id, userId, type, title, message, link) VALUES (?, ?, ?, ?, ?, ?)`);
  notify.run(uuidv4(), mgr1Id, 'approval', 'Goal Sheet Pending', 'Arjun Patel has submitted their goal sheet for review', '#/manager/review/' + gs1Id);
  notify.run(uuidv4(), emp1Id, 'info', 'Goals Submitted', 'Your goal sheet has been submitted for manager approval', '#/goals');
}

export default db;
