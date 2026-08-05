CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_number TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  google_id TEXT,
  role TEXT DEFAULT 'worker',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add role column to existing databases that predate the column
ALTER TABLE workers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'worker';

-- Profile picture URL, served as a static file from the backend
ALTER TABLE workers ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Pending email change, confirmed via a tokenized link before it takes effect
ALTER TABLE workers ADD COLUMN IF NOT EXISTS pending_email TEXT;

-- Add break_mins to existing timesheet_entries tables
ALTER TABLE timesheet_entries ADD COLUMN IF NOT EXISTS break_mins INTEGER DEFAULT 30;

-- House group on workers
ALTER TABLE workers ADD COLUMN IF NOT EXISTS house_group TEXT;

-- Payroll copy flag on housemaster worklogs
ALTER TABLE housemaster_worklogs ADD COLUMN IF NOT EXISTS for_payroll BOOLEAN DEFAULT false;

-- Per-batch break minutes — break time differs per batch, not session-wide
ALTER TABLE supervisor_batches ADD COLUMN IF NOT EXISTS total_break_mins INTEGER DEFAULT 0;

-- Worker monthly paper submissions to payroll
CREATE TABLE IF NOT EXISTS worker_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE worker_submissions ADD COLUMN IF NOT EXISTS papers_included TEXT[];
ALTER TABLE worker_submissions ADD COLUMN IF NOT EXISTS white_paper_data JSONB;
ALTER TABLE worker_submissions ADD COLUMN IF NOT EXISTS orange_paper_data JSONB;
ALTER TABLE worker_submissions ADD COLUMN IF NOT EXISTS weekly_data JSONB;
ALTER TABLE worker_submissions ADD COLUMN IF NOT EXISTS green_paper_data JSONB;
ALTER TABLE worker_submissions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE worker_submissions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'submitted';

CREATE TABLE IF NOT EXISTS timesheet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  actual_start TIME NOT NULL,
  actual_finish TIME NOT NULL,
  what_work TEXT,
  white_start TIME,
  white_finish TIME,
  white_hours TEXT,
  orange_start TIME,
  orange_finish TIME,
  orange_hours TEXT,
  total_hours TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(worker_id, entry_date)
);