<div align="center">
  <img src="rannikon-frontend/public/rannikkopuutarhalogo.png" alt="Rannikon Puutarha" width="90" height="90" />
  <h3>Rannikon</h3>
  <p><strong>Farm worker timesheet and payroll paper platform.</strong><br/>Log hours, auto-calculate white, orange, green and weekly summary papers, download as PDF or Excel.</p>
  <p>
    <a href="https://rannikon.com"><strong>rannikon.com</strong></a>
    &nbsp;&middot;&nbsp;
    <a href="https://berrystime.onrender.com">berrystime.onrender.com (API)</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/Fastify-5-000000?style=flat-square&logo=fastify&logoColor=white" alt="Fastify" />
    <img src="https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Google-OAuth2-4285F4?style=flat-square&logo=google&logoColor=white" alt="Google OAuth" />
    <img src="https://img.shields.io/badge/Android-Capacitor-3DDC84?style=flat-square&logo=android&logoColor=white" alt="Android" />
    <img src="https://img.shields.io/badge/Deployed-Render-46E3B7?style=flat-square" alt="Render" />
    <img src="https://img.shields.io/badge/License-MIT-22c55e?style=flat-square" alt="MIT" />
  </p>
</div>

---

## What it does

Berrystime is the internal timesheet platform for **Rannikon Puutarha**, a berry farm in Finland. Workers log their daily hours through a clean dashboard and the system automatically calculates all four payroll papers. Supervisors can view every worker's timesheet, export papers as PDF or Excel, and manage the team from the admin panel.

| Paper | Description |
|---|---|
| **White Paper** | Regular hourly work: 8 hrs/day, 40 hrs/week |
| **Orange Paper** | Extrawork: up to 3 hrs/day (Mon to Fri), 11 hrs on Saturdays |
| **Weekly Summary** | Mon to Sun breakdown of working, extra, and pickup hours |
| **Green Paper** | Berry picking hours: salary paid by kilos |

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (Turbopack), React 19 |
| Backend | Fastify 5, Node.js |
| Database | PostgreSQL |
| Auth | JWT + Google OAuth2 |
| Email | Resend |
| PDF | jsPDF + jspdf-autotable v5 |
| Excel | SheetJS (xlsx) |
| Mobile | Capacitor (Android APK) |
| Hosting | Render (frontend and API) |

---

## Project structure

```
berrystime/
├── berrystime-frontend/          # Next.js app
│   ├── pages/
│   │   ├── index.js              # Landing page
│   │   ├── login.js              # Login
│   │   ├── register.js           # Registration
│   │   ├── dashboard.js          # Worker dashboard: timesheet, PDF/Excel download
│   │   ├── admin.js              # Admin panel: all workers, stats, four-paper view
│   │   ├── forgot-password.js
│   │   └── reset-password.js
│   ├── lib/
│   │   ├── api.js                # Axios instance
│   │   └── auth.js               # JWT helpers
│   └── public/
│       └── rannikkopuutarhalogo.png
│
├── berrystime-backend/           # Fastify REST API
│   └── src/
│       ├── app.js                # Server entry, CORS, JWT, OAuth2
│       ├── routes/
│       │   ├── auth.js           # Register, login, Google OAuth, password reset
│       │   ├── timesheet.js      # Log, fetch, update individual fields, delete entries
│       │   └── admin.js          # Worker management, stats
│       └── db/
│           ├── index.js          # pg pool
│           ├── schema.sql        # workers + timesheet_entries tables
│           └── migrate.js        # Schema migration runner
│
└── android/                      # Capacitor Android project
```

---

## API

All protected routes require `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Email + password login |
| `GET` | `/api/auth/me` | Get current worker |
| `PATCH` | `/api/auth/work-number` | Update work number |
| `POST` | `/api/auth/forgot-password` | Send reset email |
| `POST` | `/api/auth/reset-password` | Reset with token |
| `GET` | `/api/auth/google` | Google OAuth start |
| `GET` | `/api/auth/google/callback` | Google OAuth callback |

### Timesheet

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/timesheet/:month/:year` | Fetch all entries for a month |
| `POST` | `/api/timesheet/entry` | Create or update a day entry |
| `PATCH` | `/api/timesheet/entry/:date/field` | Update a single field on an existing entry |
| `DELETE` | `/api/timesheet/entry/:date` | Delete a day entry |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/workers` | List all workers |
| `GET` | `/api/admin/workers/:id/timesheet/:month/:year` | View any worker's timesheet |
| `PATCH` | `/api/admin/workers/:id` | Edit worker details (status, role) |
| `GET` | `/api/admin/stats` | Platform-wide stats |

---

## Database

Two tables:

**`workers`** — one row per worker. Stores `work_number`, `full_name`, `email`, `password_hash`, `google_id`, `is_active`, and `role` (`worker` or `admin`).

**`timesheet_entries`** — one row per worker per day. Stores actual start/finish, calculated white paper times, orange paper times, and total hours. Unique constraint on `(worker_id, entry_date)` so posting the same date updates in place.

Hour calculation happens server-side on every `POST /api/timesheet/entry`:
- White hours = actual hours worked minus 30-min eating break
- Orange hours = time worked beyond the white paper window
- Total = white + orange

---

## Running locally

**Backend**

```bash
cd berrystime-backend
cp .env.example .env        # fill in DATABASE_URL, JWT_SECRET, RESEND_API_KEY, GOOGLE_CLIENT_*
npm install
node src/db/migrate.js      # run schema
npm run dev                 # starts on :4003
```

**Frontend**

```bash
cd berrystime-frontend
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:4003
npm install
npm run dev                        # starts on :4004
```

---

## PDF and Excel export

Each of the four paper types can be downloaded as a **PDF** or **Excel (.xlsx)** directly from the dashboard. PDFs are generated client-side with jsPDF and match the on-screen table colors exactly. Excel files are generated with SheetJS and include formatted headers and data rows. Files are named by paper type, month, year, and work number (e.g. `white-paper-June 2026-334.pdf`).

Cells in the timesheet are directly editable: click any start/finish field to change it inline, and the updated value is saved to the server immediately via `PATCH /api/timesheet/entry/:date/field`.

---

## Admin panel

Users with `role = 'admin'` are redirected to the admin panel after login. The panel shows platform-wide stats (total workers, active workers, entries this month, admins, workers with no entries, inactive workers) and a searchable worker list. Clicking "View timesheet" opens a tabbed four-paper view of that worker's full month with the same white, orange, green, and weekly summary papers the worker sees on their dashboard.

---

## Mobile (Android)

The frontend is packaged as an Android APK using Capacitor. The app points to `https://www.rannikon.com` via `server.url` in `capacitor.config.ts`, so no local build is needed for the APK. To build:

```bash
cd berrystime-frontend
npm run build
npx cap sync android
npx cap open android   # build APK in Android Studio
```

---

## Deployment

Both services are hosted on **Render**.

| Service | URL |
|---|---|
| Frontend | rannikon.com |
| API | berrystime.onrender.com |

The frontend reads `NEXT_PUBLIC_API_URL` to point at the API. CORS on the backend is locked to `rannikon.com`, `www.rannikon.com`, and `localhost:4004`.

---

## License

MIT
