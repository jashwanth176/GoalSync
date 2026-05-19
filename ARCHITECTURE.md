# AtomBerg GoalSync — Project Architecture & Design Document

## 1. System Overview

AtomBerg GoalSync is a full-stack **Performance Goal Management Portal** that supports the complete lifecycle of employee goals — from creation and alignment to quarterly check-ins, manager reviews, and organizational reporting.

### Live Demo
- **URL**: Deployed on Render (Free Tier)
- **Stack**: Vite + Vanilla JS (Frontend) | Node.js + Express + SQLite (Backend)

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Employee | arjun.patel@atomberg.com | atomberg@123 |
| Manager | rajesh.kumar@atomberg.com | atomberg@123 |
| Admin | priya.sharma@atomberg.com | atomberg@123 |

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client (Browser)                  │
│  ┌───────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  SPA Router│  │ API Client│  │  Page Components │ │
│  │ (Hash-based)│ │ (fetch)  │  │  (Vanilla JS)    │ │
│  └─────┬──────┘  └────┬─────┘  └────────┬─────────┘ │
│        │              │                  │           │
│  ┌─────┴──────────────┴──────────────────┴─────────┐│
│  │              CSS Design System                   ││
│  │  (variables.css → base.css → components.css)     ││
│  └──────────────────────────────────────────────────┘│
└──────────────────────┬───────────────────────────────┘
                       │ HTTP (REST API)
                       │ Proxied via Vite (dev) / Express static (prod)
┌──────────────────────┴───────────────────────────────┐
│                  Server (Node.js)                     │
│  ┌──────────┐  ┌───────────────────────────────────┐ │
│  │ Express  │  │         Route Handlers             │ │
│  │ Middleware│  │  auth | goals | checkins | admin  │ │
│  │ (CORS,   │  │  reports                          │ │
│  │  JSON)   │  └───────────────┬───────────────────┘ │
│  └──────────┘                  │                     │
│                    ┌───────────┴───────────┐         │
│                    │   SQLite (better-sqlite3)│       │
│                    │   WAL Mode | Foreign Keys│       │
│                    └──────────────────────────┘       │
└───────────────────────────────────────────────────────┘
```

### 2.2 Project Structure

```
GoalSync/
├── index.html              # SPA entry point + Lucide Icons CDN
├── vite.config.js          # Dev proxy (port 5173 → 3000)
├── render.yaml             # Render deployment config
├── package.json            # Dependencies & scripts
│
├── public/
│   └── assets/
│       └── logo.png        # AtomBerg logo (static asset)
│
├── server/
│   ├── index.js            # Express server entry (port 3000)
│   ├── db.js               # SQLite schema, migrations & seed data
│   └── routes/
│       ├── auth.js         # Authentication (email/password login)
│       ├── goals.js        # Goal sheets, goals CRUD, notifications
│       ├── checkins.js     # Quarterly check-ins & auto-scoring
│       ├── admin.js        # Cycles, shared goals, escalation, stats
│       └── reports.js      # Achievement, completion, analytics, email log
│
├── src/
│   ├── main.js             # App shell: sidebar, header, routing, toasts
│   ├── router.js           # Hash-based SPA router
│   ├── api.js              # REST API client (all fetch calls)
│   ├── pages/
│   │   ├── LoginPage.js          # Email/password authentication
│   │   ├── EmployeeDashboard.js  # Employee home (stats, quick actions)
│   │   ├── GoalSheetPage.js      # Goal CRUD with validation
│   │   ├── CheckInPage.js        # Quarterly achievement entry
│   │   ├── ManagerDashboard.js   # Team overview & pending reviews
│   │   ├── GoalReviewPage.js     # Approve/return goal sheets
│   │   ├── AdminDashboard.js     # Org stats, hierarchy, pipeline
│   │   ├── SharedGoalsPage.js    # Cascaded/shared goals
│   │   ├── EscalationPage.js     # Rules, logs, chain visualization
│   │   ├── ReportsPage.js        # Reports, analytics, email log
│   │   └── AuditLogPage.js       # Full change audit trail
│   └── styles/
│       ├── variables.css   # Design tokens (colors, spacing, typography)
│       ├── base.css        # Reset, animations, utility classes
│       ├── components.css  # Cards, badges, buttons, tables, modals
│       └── layout.css      # Sidebar, header, grid, responsive breakpoints
│
└── dist/                   # Production build output (Vite)
```

---

## 3. Database Schema

### Entity Relationship

```
users ──────┐
  │         │ (managerId → users.id)
  │         └──────────────────────┐
  ├── goal_sheets (employeeId)     │
  │     └── goals (goalSheetId)    │
  │           └── achievements     │
  │     └── checkins               │
  ├── notifications (userId)       │
  ├── escalation_log (employeeId, escalatedToId)
  ├── email_log                    │
  └── audit_log (changedBy)        │
                                   │
cycles ── goal_sheets (cycleId)    │
escalation_rules ── escalation_log (ruleId)
shared_goal_templates (createdBy ──┘)
```

### Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | All employees, managers, admins | email, password, role, managerId, department |
| `cycles` | Performance review cycles | name, year, goalSetting/Q1-Q4 open/close dates |
| `goal_sheets` | Per-employee per-cycle goal container | status (draft→submitted→approved/returned) |
| `goals` | Individual goals within a sheet | thrustArea, uom, target, weightage, isShared |
| `achievements` | Quarterly actual values | goalId, quarter, actual, score (auto-computed) |
| `checkins` | Quarterly review status | employeeCompleted, managerCompleted, managerComment |
| `audit_log` | Every change tracked | entityType, action, changedBy, field, old/new values |
| `notifications` | In-app alerts | userId, type, title, message, isRead |
| `escalation_rules` | Auto-escalation triggers | triggerType, delayDays, active |
| `escalation_log` | Escalation events | employeeId, escalatedToId, level, status |
| `email_log` | Email/notification delivery log | recipientEmail, type, subject, channel, status |
| `shared_goal_templates` | Org-wide cascaded goals | thrustArea, title, target, department |

---

## 4. Authentication & Authorization

### 4.1 Current Implementation (Email/Password)

```
POST /api/auth/login
Body: { email: "user@atomberg.com", password: "atomberg@123" }
Response: { id, name, email, department, role, managerId, avatar }
```

- Password stored in `users.password` column
- No password hashing in demo mode (production would use bcrypt)
- Role-based routing: Employee → `/dashboard`, Manager → `/manager`, Admin → `/admin`
- Session managed client-side via `currentUser` variable

### 4.2 Microsoft Entra ID (Azure AD) Integration — Production Ready

The portal is architectured for SSO integration with **Microsoft Entra ID**:

**Integration Points:**
1. **MSAL.js** library would replace the email/password login
2. The `/api/auth/login` endpoint accepts a `userId` parameter for token-based auth
3. User records in `users` table map to Azure AD profiles via email
4. The `managerId` hierarchy syncs from Azure AD org chart

**Production Implementation Steps:**
```
1. Register app in Azure Portal → App Registrations
2. Configure redirect URIs and API permissions (User.Read, Directory.Read.All)
3. Add MSAL.js to frontend:
   - loginPopup() or loginRedirect() for SSO
   - acquireTokenSilent() for API calls
4. Backend validates JWT tokens from Azure AD
5. Org hierarchy auto-syncs from Microsoft Graph API
```

**Current Status:** Integration hooks are in place. The Escalation page shows "Microsoft Entra ID: Ready" status indicator. The `managerId` field in the users table directly maps to Azure AD's manager property.

---

## 5. Email & Notification System

### 5.1 Multi-Channel Notifications

The portal supports three notification channels:

| Channel | Implementation | Status |
|---------|---------------|--------|
| **In-App** | `notifications` table + bell icon badge | Fully Active |
| **Email** | `email_log` table + SMTP hooks | Logged (SMTP ready) |
| **MS Teams** | `email_log` table (channel='teams') | Logged (Bot ready) |

### 5.2 Automated Email Triggers

Emails are automatically logged when these events occur:

| Event | Recipients | Email Type |
|-------|-----------|------------|
| Goal Sheet Submitted | Manager (notification), Employee (confirmation) | submission, confirmation |
| Goal Sheet Approved | Employee | approval |
| Goal Sheet Returned | Employee | rejection |
| Check-in Completed | Employee | checkin |
| Escalation Triggered | Manager/Admin | escalation |

### 5.3 Email Log API

```
GET /api/reports/email-log
Response: [{ recipientEmail, recipientName, type, subject, status, channel, createdAt }]
```

### 5.4 Production SMTP Integration

To activate real email delivery:

```javascript
// Replace addEmailLog() in goals.js with:
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,      // e.g., smtp.sendgrid.net
  port: 587,
  auth: {
    user: process.env.SMTP_USER,    // e.g., apikey
    pass: process.env.SMTP_PASS     // e.g., SG.xxxxx
  }
});

async function sendEmail(to, subject, html) {
  await transporter.sendMail({
    from: '"AtomBerg GoalSync" <noreply@atomberg.com>',
    to, subject, html
  });
  addEmailLog(to, '', 'submission', subject, 'email');
}
```

### 5.5 MS Teams Bot Integration

For Teams notifications via Adaptive Cards:

```javascript
// Production: Use Microsoft Bot Framework
const { TeamsActivityHandler } = require('botbuilder');

// Send adaptive card to Teams channel
async function sendTeamsNotification(userId, title, body) {
  const card = CardFactory.adaptiveCard({
    type: "AdaptiveCard", body: [
      { type: "TextBlock", text: title, weight: "Bolder" },
      { type: "TextBlock", text: body }
    ],
    actions: [{ type: "Action.OpenUrl", title: "Open GoalSync", url: PORTAL_URL }]
  });
  await context.sendActivity({ attachments: [card] });
}
```

---

## 6. Escalation Engine

### 6.1 Three-Tier Escalation Chain

```
Level 1 (N days)      Level 2 (N+3 days)     Level 3 (N+7 days)
┌──────────────┐      ┌──────────────┐       ┌──────────────┐
│   Employee   │ ───→ │   Manager    │ ───→  │   HR/Admin   │
│  (Reminder)  │      │ (Escalation) │       │ (Full Audit) │
└──────────────┘      └──────────────┘       └──────────────┘
```

### 6.2 Configurable Rules

| Trigger | Default Delay | Description |
|---------|--------------|-------------|
| `goal_not_submitted` | 7 days | Employee hasn't submitted goals after cycle opens |
| `goal_not_approved` | 5 days | Manager hasn't approved after submission |
| `checkin_not_completed` | 10 days | Quarterly check-in not done within window |

### 6.3 Escalation Log API

```
GET  /api/admin/escalation-logs     → List all escalation events
PUT  /api/admin/escalation-logs/:id → Resolve/dismiss an escalation
```

Each log entry tracks: employee, escalated-to, level (L1/L2/L3), detail, status (pending/resolved/dismissed).

---

## 7. Scoring Engine

### Auto-Scoring for 4 UoM Types

```javascript
// Numeric (Min = higher is better)
score = (actual / target) × 100    // capped at 100

// Numeric (Max = lower is better)
score = (target / actual) × 100    // capped at 100

// Percentage — same as Numeric

// Timeline
if (actual <= target) score = 100
else score = 100 - (daysLate × 2)  // -2% per day late

// Zero-based
score = (actual === 0) ? 100 : 0   // binary pass/fail
```

### Validation Rules (Backend-Enforced)

| Rule | Frontend | Backend |
|------|----------|---------|
| Min 1 goal per sheet | Validation panel | `goals.length === 0` → 400 |
| Max 8 goals per sheet | Button disabled | `existingGoals >= 8` → 400 |
| Min 10% weightage per goal | Error message | `weightage < 10` → 400 |
| Total weightage = 100% | Submit hidden | `abs(total - 100) > 0.01` → 400 |
| Total can't exceed 100% | — | Sum check → 400 |

---

## 8. API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with email/password |
| GET | `/api/auth/users` | List all users |
| GET | `/api/auth/user/:id` | Get user by ID |
| GET | `/api/auth/team/:managerId` | Get manager's team |

### Goals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/goals/sheets` | List sheets (filter by employeeId, cycleId) |
| GET | `/api/goals/sheets/:id` | Get sheet with goals |
| POST | `/api/goals/sheets` | Create new sheet |
| POST | `/api/goals/sheets/:id/goals` | Add goal to sheet |
| PUT | `/api/goals/goals/:id` | Update goal |
| DELETE | `/api/goals/goals/:id` | Delete goal |
| POST | `/api/goals/sheets/:id/submit` | Submit for approval |
| POST | `/api/goals/sheets/:id/approve` | Manager approve |
| POST | `/api/goals/sheets/:id/return` | Manager return |
| GET | `/api/goals/notifications/:userId` | Get notifications |
| PUT | `/api/goals/notifications/:id/read` | Mark notification read |

### Check-ins
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/checkins/sheet/:id/:quarter` | Get goals with achievements |
| POST | `/api/checkins/update` | Update quarterly actual |
| POST | `/api/checkins/manager-comment` | Add manager check-in comment |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/cycles` | List cycles |
| POST | `/api/admin/cycles` | Create cycle |
| PUT | `/api/admin/cycles/:id` | Update cycle |
| POST | `/api/admin/unlock-goal-sheet/:id` | Unlock approved sheet |
| GET/POST | `/api/admin/shared-goals` | Shared goal templates |
| GET/POST/PUT/DELETE | `/api/admin/escalation-rules` | Escalation rules CRUD |
| GET | `/api/admin/escalation-logs` | Escalation event log |
| PUT | `/api/admin/escalation-logs/:id` | Resolve/dismiss escalation |
| GET | `/api/admin/stats` | Organization statistics |
| GET | `/api/admin/all-users` | All users with manager names |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/achievement` | Goal achievement data |
| GET | `/api/reports/completion` | Completion matrix |
| GET | `/api/reports/audit` | Audit trail |
| GET | `/api/reports/email-log` | Email delivery log |
| GET | `/api/reports/analytics/department` | Department analytics |
| GET | `/api/reports/analytics/manager-effectiveness` | Manager metrics |

---

## 9. Cost Optimization

| Decision | Rationale |
|----------|-----------|
| **SQLite** | Zero-cost database, no external DB service needed |
| **Vanilla JS** | No React/Vue/Angular — zero framework overhead, ~95KB bundle |
| **Lucide Icons (CDN)** | No icon font download, tree-shakeable SVGs |
| **WAL mode** | Concurrent reads without locking |
| **Prepared statements** | Efficient query execution |
| **Static SPA** | Servable from CDN, minimal server load |
| **Render Free Tier** | $0/month hosting |
| **No external APIs** | Self-contained, no per-request costs |

**Estimated Monthly Cost: $0** (Render free tier)

---

## 10. Security Considerations

| Area | Current (Demo) | Production Recommendation |
|------|---------------|--------------------------|
| Passwords | Plain text | bcrypt hashing |
| Sessions | Client-side variable | JWT tokens with httpOnly cookies |
| API Auth | None (open) | Bearer token middleware |
| CORS | Allow all | Restrict to portal domain |
| Input | Basic validation | SQL parameterized (already done) + XSS sanitization |
| Rate Limiting | None | express-rate-limit middleware |
| HTTPS | Render provides | Enforce via HSTS header |

---

## 11. Deployment

### Render (Current)

```yaml
# render.yaml
services:
  - type: web
    name: atomberg-goalsync
    runtime: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
```

### Production Upgrade Path

1. **Database**: Migrate SQLite → PostgreSQL (Render provides managed Postgres)
2. **Auth**: Add Microsoft Entra ID SSO via MSAL.js
3. **Email**: Integrate SendGrid/AWS SES for real email delivery
4. **Teams**: Deploy Microsoft Bot Framework for adaptive card notifications
5. **Monitoring**: Add Sentry for error tracking, PM2 for process management
6. **Caching**: Add Redis for session storage and notification queuing
