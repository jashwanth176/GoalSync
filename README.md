# AtomBerg GoalSync — Performance Goal Management Portal

A full-stack web portal for managing employee performance goals, quarterly check-ins, and organizational reporting. Built with **Vite + Vanilla JS** (frontend) and **Node.js/Express + SQLite** (backend).

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server (frontend + backend)
npm run dev
```

Open **http://localhost:5173** in your browser.

## 🔐 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Employee** | arjun.patel@atomberg.com | atomberg@123 |
| **Manager** | rajesh.kumar@atomberg.com | atomberg@123 |
| **Admin** | priya.sharma@atomberg.com | atomberg@123 |

> Use the **quick-fill buttons** on the login page to auto-populate credentials.

## 📋 Features

### Employee Portal
- **Dashboard** — Overview of goals, weightage, and sheet status
- **Goal Setting** — Create/edit/delete goals with Thrust Area, UoM (Numeric, Percentage, Timeline, Zero), Target, and Weightage (min 10%, total 100%)
- **Quarterly Check-ins** — Enter Q1–Q4 actuals with auto-scoring engine
- **Notifications** — Real-time in-app alerts with bell icon badge

### Manager Portal
- **Team Dashboard** — Monitor all direct reports' goal sheets
- **Goal Review** — Approve or return sheets with comments
- **Check-in Reviews** — Add quarterly manager comments and feedback

### Admin Portal
- **Org Dashboard** — Pipeline stats, department completion, org hierarchy tree
- **Cycle Management** — Create, activate, and close performance cycles
- **Shared Goals** — Push cascaded goals to selected employees
- **Escalation Rules** — Configure auto-escalation triggers with delay periods
- **Escalation Logs** — Track escalation events with L1/L2 levels and resolve actions
- **Goal Sheet Unlock** — Override locked sheets for editing

### Reports & Analytics
- **Achievement Report** — Full goal data with CSV/Excel export
- **Completion Dashboard** — Heatmap matrix of check-in progress across employees
- **Analytics** — Manager effectiveness, department performance, thrust area & UoM distribution
- **Email & Notification Log** — Multi-channel (Email, Teams, In-App) delivery tracking
- **Audit Trail** — Complete change history with timestamps

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + Vanilla JavaScript |
| Styling | CSS Variables + Custom Components |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Routing | Hash-based SPA router |

## 📁 Project Structure

```
├── server/
│   ├── index.js            # Express server
│   ├── db.js               # Schema + seed data
│   └── routes/
│       ├── auth.js         # Email/password login
│       ├── goals.js        # Goal sheets & goals CRUD
│       ├── checkins.js     # Quarterly check-ins + scoring
│       ├── admin.js        # Cycles, shared goals, escalation
│       └── reports.js      # Reports, analytics, email log
├── src/
│   ├── main.js             # App shell, sidebar, notifications
│   ├── router.js           # SPA routing
│   ├── api.js              # API client
│   ├── pages/              # Page components
│   └── styles/             # CSS design system
├── public/assets/          # Logo & static assets
├── package.json
└── vite.config.js          # Proxy config
```

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Email/password login |
| GET | `/api/goals/sheets` | List goal sheets |
| POST | `/api/goals/sheets/:id/goals` | Add goal to sheet |
| POST | `/api/goals/sheets/:id/submit` | Submit for review |
| POST | `/api/goals/sheets/:id/approve` | Manager approve |
| POST | `/api/checkins/update` | Update quarterly actuals |
| GET | `/api/admin/cycles` | List performance cycles |
| POST | `/api/admin/shared-goals` | Push cascaded goals |
| GET | `/api/admin/escalation-logs` | Escalation event log |
| GET | `/api/reports/achievement` | Achievement data |
| GET | `/api/reports/email-log` | Email delivery log |
| GET | `/api/reports/analytics/*` | Analytics endpoints |

## 📝 Database

SQLite database auto-creates on first run with seed data including:
- **9 users** (1 admin, 2 managers, 6 employees) across Engineering & Marketing
- **2 performance cycles** (FY 2025-26, FY 2026-27)
- **1 pre-filled goal sheet** with 4 goals (100% weightage)
- **3 escalation rules** (goal submission, approval, check-in)
- **3 email log entries** (submission notification, confirmation, Teams)
- **3 escalation log entries** (L1 + L2 escalation chain)
