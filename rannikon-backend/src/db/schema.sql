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

-- Add break_mins to existing timesheet_entries tables
ALTER TABLE timesheet_entries ADD COLUMN IF NOT EXISTS break_mins INTEGER DEFAULT 30;

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