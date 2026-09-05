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

-- Worker leave/holiday/break requests: worker submits -> housemaster forwards -> admin decides
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  house_group TEXT,
  request_type TEXT NOT NULL,
  reason TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'pending_housemaster',
  forwarded_by UUID REFERENCES workers(id),
  forwarded_at TIMESTAMPTZ,
  decided_by UUID REFERENCES workers(id),
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Known worker roster (number -> name), used to power the supervisor's
-- search-and-mark worker picker. Grows as supervisors encounter workers not
-- yet listed. Seeded once from any workers with a login account.
CREATE TABLE IF NOT EXISTS worker_directory (
  worker_number TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  house_group TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO worker_directory (worker_number, full_name, house_group)
  SELECT work_number, full_name, house_group FROM workers
  WHERE full_name IS NOT NULL AND full_name != ''
  ON CONFLICT (worker_number) DO NOTHING;
INSERT INTO worker_directory (worker_number, full_name, house_group)
  SELECT DISTINCT ON (worker_number) worker_number, worker_name, house_group FROM supervisor_logs
  WHERE worker_name IS NOT NULL AND worker_name != ''
  ORDER BY worker_number, created_at DESC
  ON CONFLICT (worker_number) DO NOTHING;

-- Full 0-999 roster backfill: every possible worker number gets a directory
-- row tagged with its house group, blank name, even numbers with no account
-- yet, so the supervisor picker always shows the complete range per house.
INSERT INTO worker_directory (worker_number, full_name, house_group)
  SELECT n::text, '', CASE
    WHEN n BETWEEN 100 AND 199 THEN 'Kivilinna/Salo'
    WHEN n BETWEEN 200 AND 299 THEN 'Karton Cambodia'
    WHEN n BETWEEN 300 AND 399 THEN 'Karton International'
    WHEN n BETWEEN 400 AND 499 THEN 'Vassila'
    WHEN n BETWEEN 500 AND 599 THEN 'Suppala'
    WHEN n BETWEEN 600 AND 699 THEN 'Salo/Turku'
    ELSE 'Unknown'
  END
  FROM generate_series(0, 999) AS n
  ON CONFLICT (worker_number) DO NOTHING;

-- Real names transcribed from the Karton International paper attendance
-- sheet. Only fills in a name where the directory entry is still blank, so
-- it never clobbers a name already known from a real login account.
INSERT INTO worker_directory (worker_number, full_name, house_group) VALUES
  ('300', 'Anish Neupane', 'Karton International'),
  ('303', 'Kim Tien Lu', 'Karton International'),
  ('304', 'Thi Duc Hoan', 'Karton International'),
  ('308', 'Pradip Bhandari', 'Karton International'),
  ('310', 'Manisha Karki', 'Karton International'),
  ('313', 'Rojina Basnet', 'Karton International'),
  ('314', 'Arun Roka', 'Karton International'),
  ('315', 'Devika Rai', 'Karton International'),
  ('316', 'Thi Anh Hong Le', 'Karton International'),
  ('317', 'Thi Bang Pham', 'Karton International'),
  ('318', 'Pham Thai An Cao', 'Karton International'),
  ('319', 'Shradda Bhattarai', 'Karton International'),
  ('326', 'Leslie Funcham', 'Karton International'),
  ('329', 'Badal Ghimere', 'Karton International'),
  ('330', 'Anisha Giri', 'Karton International'),
  ('331', 'Deba Jephthan Akam', 'Karton International'),
  ('332', 'Bamila Jedidah Pacis', 'Karton International'),
  ('333', 'Alonge Folashade', 'Karton International'),
  ('334', 'Victor Abuchi', 'Karton International'),
  ('336', 'Aashish Nepali', 'Karton International'),
  ('337', 'Gajendra Subba', 'Karton International'),
  ('346', 'Durga BK', 'Karton International'),
  ('347', 'Bharat Kumar', 'Karton International'),
  ('348', 'Bui Huu Hanh', 'Karton International'),
  ('349', 'Le Thi Mai', 'Karton International'),
  ('353', 'Pham Thi Tuoi', 'Karton International'),
  ('355', 'Sharoj Kumar Shaj', 'Karton International'),
  ('358', 'Binita Rai', 'Karton International'),
  ('359', 'Akinrinola Thomas', 'Karton International')
  ON CONFLICT (worker_number) DO UPDATE SET full_name = EXCLUDED.full_name
    WHERE worker_directory.full_name = '' OR worker_directory.full_name IS NULL;

-- Backfill house_group for legacy rows seeded before house_group existed on
-- their source record (numeric worker numbers only; temp G-xxxxxx
-- registration numbers have no fixed house and are left alone).
UPDATE worker_directory SET house_group = CASE
    WHEN worker_number::int BETWEEN 100 AND 199 THEN 'Kivilinna/Salo'
    WHEN worker_number::int BETWEEN 200 AND 299 THEN 'Karton Cambodia'
    WHEN worker_number::int BETWEEN 300 AND 399 THEN 'Karton International'
    WHEN worker_number::int BETWEEN 400 AND 499 THEN 'Vassila'
    WHEN worker_number::int BETWEEN 500 AND 599 THEN 'Suppala'
    WHEN worker_number::int BETWEEN 600 AND 699 THEN 'Salo/Turku'
    ELSE 'Unknown'
  END
  WHERE house_group IS NULL AND worker_number ~ '^[0-9]+$';

-- Salo/Turku is capped at 600-699; anything seeded under the old open-ended
-- 600+ rule for 700-999 (blank placeholders only, never a real account) is
-- retagged to Unknown.
UPDATE worker_directory SET house_group = 'Unknown'
  WHERE house_group = 'Salo/Turku' AND worker_number ~ '^[0-9]+$' AND worker_number::int >= 700;