'use strict'

const db = require('../db/index')

const LOOKBACK_DAYS = 120
const WARNING_THRESHOLD = 5
const FLAG_THRESHOLD = 6

function toDateStr(d) {
  return d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10)
}

// For each active worker, finds how many consecutive "operating days" (days the
// farm actually recorded work) they've had no supervisor log at all, counting
// back from the most recent operating day. Only reported when that streak has
// no leave_requests row overlapping it — a worker who filed a request for the
// period isn't flagged, no matter how long the absence.
async function getWorkerAbsenceStatuses() {
  const opDaysRes = await db.query(
    `SELECT DISTINCT session_date FROM supervisor_sessions
     WHERE session_date >= CURRENT_DATE - INTERVAL '${LOOKBACK_DAYS} days'
     ORDER BY session_date DESC`
  )
  const operatingDays = opDaysRes.rows.map(r => toDateStr(r.session_date))
  if (!operatingDays.length) return []

  const earliestDay = operatingDays[operatingDays.length - 1]

  // Only track workers who have a real logging history — otherwise a worker
  // who has never once been recorded by a supervisor (e.g. a fresh
  // self-registration) would be flagged as "absent" from day one.
  const workersRes = await db.query(
    `SELECT id, work_number, full_name, house_group FROM workers w
     WHERE role = 'worker' AND is_active = true
     AND EXISTS (SELECT 1 FROM supervisor_logs sl WHERE sl.worker_number = w.work_number)`
  )

  const logsRes = await db.query(
    `SELECT DISTINCT s.session_date, sl.worker_number
     FROM supervisor_logs sl JOIN supervisor_sessions s ON s.id = sl.session_id
     WHERE s.session_date >= $1`,
    [earliestDay]
  )
  const workedDaysByNumber = {}
  for (const row of logsRes.rows) {
    const d = toDateStr(row.session_date)
    if (!workedDaysByNumber[row.worker_number]) workedDaysByNumber[row.worker_number] = new Set()
    workedDaysByNumber[row.worker_number].add(d)
  }

  const lrRes = await db.query(
    `SELECT worker_id, start_date, end_date FROM leave_requests WHERE end_date >= $1`,
    [earliestDay]
  )
  const requestsByWorker = {}
  for (const row of lrRes.rows) {
    if (!requestsByWorker[row.worker_id]) requestsByWorker[row.worker_id] = []
    requestsByWorker[row.worker_id].push({ start: toDateStr(row.start_date), end: toDateStr(row.end_date) })
  }

  const results = []
  for (const w of workersRes.rows) {
    const workedSet = workedDaysByNumber[w.work_number] || new Set()
    let consecutive = 0
    let streakStart = null
    for (const day of operatingDays) {
      if (workedSet.has(day)) break
      consecutive++
      streakStart = day
    }
    if (consecutive < WARNING_THRESHOLD) continue

    const mostRecentAbsentDay = operatingDays[0]
    const covered = (requestsByWorker[w.id] || []).some(r => r.start <= mostRecentAbsentDay && r.end >= streakStart)
    if (covered) continue

    results.push({
      worker_id: w.id,
      work_number: w.work_number,
      full_name: w.full_name,
      house_group: w.house_group,
      consecutive_days: consecutive,
      since_date: streakStart,
      level: consecutive >= FLAG_THRESHOLD ? 'flagged' : 'warning',
    })
  }

  return results.sort((a, b) => b.consecutive_days - a.consecutive_days)
}

module.exports = { getWorkerAbsenceStatuses, WARNING_THRESHOLD, FLAG_THRESHOLD }
