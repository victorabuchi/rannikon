'use strict'

const db = require('../db/index')

function toMins(t) {
  if (!t) return null
  const str = String(t).slice(0, 5)
  const parts = str.split(':')
  if (parts.length < 2) return null
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

function minsToHHMM(m) {
  if (!m || m <= 0) return '0:00'
  return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0')
}

function parseHHMM(t) {
  if (!t) return 0
  const parts = String(t).split(':')
  return parseInt(parts[0]) * 60 + (parseInt(parts[1]) || 0)
}

module.exports = async function payrollRoutes(fastify) {

  async function isPayroll(request, reply) {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
    const result = await db.query('SELECT role FROM workers WHERE id = $1', [request.user.id])
    if (!result.rows[0] || !['payroll', 'admin'].includes(result.rows[0].role)) {
      return reply.status(403).send({ error: 'Payroll access required' })
    }
  }

  // Worker search for payroll users
  fastify.get('/api/payroll/workers', { onRequest: [isPayroll] }, async (request, reply) => {
    const { q } = request.query
    let result
    if (q) {
      result = await db.query(
        `SELECT id, work_number, full_name, house_group FROM workers
         WHERE is_active = true AND work_number IS NOT NULL AND work_number != '' AND (
           LOWER(full_name) LIKE $1 OR work_number LIKE $1
         )
         ORDER BY
           CASE WHEN work_number ~ '^[0-9]+$' THEN work_number::int ELSE 9999 END ASC
         LIMIT 30`,
        ['%' + q.toLowerCase() + '%']
      )
    } else {
      result = await db.query(
        `SELECT id, work_number, full_name, house_group FROM workers
         WHERE is_active = true AND work_number IS NOT NULL AND work_number != ''
         ORDER BY
           CASE WHEN work_number ~ '^[0-9]+$' THEN work_number::int ELSE 9999 END ASC`
      )
    }
    return reply.send({ workers: result.rows })
  })

  // All worker monthly submissions
  fastify.get('/api/payroll/submissions', { onRequest: [isPayroll] }, async (request, reply) => {
    const result = await db.query(
      `SELECT ws.*, w.full_name, w.work_number, w.house_group
       FROM worker_submissions ws
       JOIN workers w ON w.id = ws.worker_id
       ORDER BY ws.submitted_at DESC`
    )
    return reply.send({ submissions: result.rows })
  })

  // One worker's submissions
  fastify.get('/api/payroll/submissions/:worker_id', { onRequest: [isPayroll] }, async (request, reply) => {
    const result = await db.query(
      `SELECT ws.*, w.full_name, w.work_number, w.house_group
       FROM worker_submissions ws
       JOIN workers w ON w.id = ws.worker_id
       WHERE ws.worker_id = $1
       ORDER BY ws.submitted_at DESC`,
      [request.params.worker_id]
    )
    return reply.send({ submissions: result.rows })
  })

  // Daily supervisor worklogs (same as admin view)
  fastify.get('/api/payroll/worklogs/:date', { onRequest: [isPayroll] }, async (request, reply) => {
    const result = await db.query(
      `SELECT sl.*, w.full_name as supervisor_name, ss.total_break_mins as session_break, ss.session_date
       FROM supervisor_logs sl
       JOIN supervisor_sessions ss ON ss.id = sl.session_id
       JOIN workers w ON w.id = ss.supervisor_id
       WHERE ss.session_date = $1
       ORDER BY
         CASE WHEN sl.worker_number ~ '^[0-9]+$' THEN sl.worker_number::int ELSE 9999 END ASC`,
      [request.params.date]
    )
    return reply.send({ logs: result.rows })
  })

  // Smart verification: compare worker submissions vs supervisor daily logs
  fastify.get('/api/payroll/verify/:worker_id/:month/:year', { onRequest: [isPayroll] }, async (request, reply) => {
    const { worker_id, month, year } = request.params

    const workerResult = await db.query(
      'SELECT id, work_number, full_name, house_group FROM workers WHERE id = $1',
      [worker_id]
    )
    if (!workerResult.rows[0]) return reply.status(404).send({ error: 'Worker not found' })
    const worker = workerResult.rows[0]

    const timesheetResult = await db.query(
      `SELECT entry_date, actual_start, actual_finish, break_mins, white_hours, orange_hours, total_hours
       FROM timesheet_entries
       WHERE worker_id = $1
       AND EXTRACT(MONTH FROM entry_date) = $2
       AND EXTRACT(YEAR FROM entry_date) = $3
       ORDER BY entry_date ASC`,
      [worker_id, month, year]
    )

    const supervisorResult = await db.query(
      `SELECT sl.start_time, sl.finish_time, sl.total_break_mins, sl.total_hours, ss.session_date
       FROM supervisor_logs sl
       JOIN supervisor_sessions ss ON ss.id = sl.session_id
       WHERE sl.worker_number = $1
       AND EXTRACT(MONTH FROM ss.session_date) = $2
       AND EXTRACT(YEAR FROM ss.session_date) = $3
       ORDER BY ss.session_date ASC`,
      [worker.work_number, month, year]
    )

    // Build date-keyed maps
    const timesheetMap = {}
    timesheetResult.rows.forEach(e => {
      const d = e.entry_date instanceof Date
        ? e.entry_date.toISOString().split('T')[0]
        : String(e.entry_date).split('T')[0]
      timesheetMap[d] = e
    })

    const supervisorMap = {}
    supervisorResult.rows.forEach(e => {
      const d = e.session_date instanceof Date
        ? e.session_date.toISOString().split('T')[0]
        : String(e.session_date).split('T')[0]
      supervisorMap[d] = e
    })

    const allDates = new Set([...Object.keys(timesheetMap), ...Object.keys(supervisorMap)])
    const sortedDates = Array.from(allDates).sort()

    const matches = sortedDates.map(date => {
      const sup = supervisorMap[date]
      const entry = timesheetMap[date]

      const supervisor_recorded = sup ? {
        start: String(sup.start_time).slice(0, 5),
        finish: String(sup.finish_time).slice(0, 5),
        break: sup.total_break_mins,
        total: sup.total_hours
      } : null

      const worker_submitted = entry ? {
        start: String(entry.actual_start).slice(0, 5),
        finish: String(entry.actual_finish).slice(0, 5),
        break: entry.break_mins,
        total: entry.total_hours
      } : null

      let status
      if (!sup && !entry) {
        status = 'no_data'
      } else if (!sup) {
        status = 'missing_supervisor'
      } else if (!entry) {
        status = 'missing_worker'
      } else {
        const sm = toMins(sup.start_time)
        const em = toMins(entry.actual_start)
        const fm = toMins(sup.finish_time)
        const wfm = toMins(entry.actual_finish)
        const startMatch = sm !== null && em !== null && Math.abs(sm - em) <= 5
        const finishMatch = fm !== null && wfm !== null && Math.abs(fm - wfm) <= 5
        status = startMatch && finishMatch ? 'match' : 'mismatch'
      }

      return { date, supervisor_recorded, worker_submitted, status }
    })

    const relevant = matches.filter(m => m.status !== 'no_data')
    const total_days_worked = relevant.length
    const days_match = relevant.filter(m => m.status === 'match').length
    const days_mismatch = relevant.filter(m => m.status === 'mismatch').length
    const days_missing = relevant.filter(m => m.status === 'missing_supervisor' || m.status === 'missing_worker').length

    const total_white_mins = timesheetResult.rows.reduce((s, e) => s + parseHHMM(e.white_hours), 0)
    const total_orange_mins = timesheetResult.rows.reduce((s, e) => s + parseHHMM(e.orange_hours), 0)
    const total_mins = timesheetResult.rows.reduce((s, e) => s + parseHHMM(e.total_hours), 0)

    let verification_status
    if (total_days_worked === 0) {
      verification_status = 'incomplete'
    } else if (days_mismatch > 0 || days_missing > 0) {
      verification_status = 'discrepancies_found'
    } else {
      verification_status = 'verified'
    }

    return reply.send({
      worker,
      matches: relevant,
      summary: {
        total_days_worked,
        days_match,
        days_mismatch,
        days_missing,
        total_white_hours: minsToHHMM(total_white_mins),
        total_orange_hours: minsToHHMM(total_orange_mins),
        total_hours: minsToHHMM(total_mins),
        verification_status
      }
    })
  })

  // Batch verification summary for all submissions in a given month
  fastify.get('/api/payroll/month-summary/:month/:year', { onRequest: [isPayroll] }, async (request, reply) => {
    const { month, year } = request.params

    const subsResult = await db.query(
      `SELECT ws.id, ws.worker_id, ws.status, ws.submitted_at,
              w.work_number, w.full_name, w.house_group
       FROM worker_submissions ws
       JOIN workers w ON w.id = ws.worker_id
       WHERE ws.month = $1 AND ws.year = $2
       ORDER BY CASE WHEN w.work_number ~ '^[0-9]+$' THEN w.work_number::int ELSE 9999 END ASC`,
      [month, year]
    )
    if (subsResult.rows.length === 0) return reply.send({ summaries: [] })

    const workerIds = subsResult.rows.map(r => r.worker_id)
    const workNumbers = subsResult.rows.map(r => r.work_number)

    const [tsResult, supResult] = await Promise.all([
      db.query(
        `SELECT worker_id, entry_date, actual_start, actual_finish, total_hours
         FROM timesheet_entries
         WHERE worker_id = ANY($1) AND EXTRACT(MONTH FROM entry_date) = $2 AND EXTRACT(YEAR FROM entry_date) = $3`,
        [workerIds, month, year]
      ),
      db.query(
        `SELECT sl.worker_number, sl.start_time, sl.finish_time, ss.session_date
         FROM supervisor_logs sl
         JOIN supervisor_sessions ss ON ss.id = sl.session_id
         WHERE sl.worker_number = ANY($1) AND EXTRACT(MONTH FROM ss.session_date) = $2 AND EXTRACT(YEAR FROM ss.session_date) = $3`,
        [workNumbers, month, year]
      )
    ])

    const tsByWorker = {}
    tsResult.rows.forEach(e => {
      if (!tsByWorker[e.worker_id]) tsByWorker[e.worker_id] = []
      tsByWorker[e.worker_id].push(e)
    })
    const supByNum = {}
    supResult.rows.forEach(e => {
      if (!supByNum[e.worker_number]) supByNum[e.worker_number] = []
      supByNum[e.worker_number].push(e)
    })

    const summaries = subsResult.rows.map(sub => {
      const tsEntries = tsByWorker[sub.worker_id] || []
      const supEntries = supByNum[sub.work_number] || []

      const tsMap = {}
      tsEntries.forEach(e => { tsMap[String(e.entry_date).split('T')[0]] = e })
      const supMap = {}
      supEntries.forEach(e => { supMap[String(e.session_date).split('T')[0]] = e })

      const allDates = new Set([...Object.keys(tsMap), ...Object.keys(supMap)])
      let days_match = 0, days_mismatch = 0, days_missing = 0
      allDates.forEach(date => {
        const sup = supMap[date], entry = tsMap[date]
        if (!sup && !entry) return
        if (!sup || !entry) { days_missing++; return }
        const sm = toMins(sup.start_time), em = toMins(entry.actual_start)
        const fm = toMins(sup.finish_time), wfm = toMins(entry.actual_finish)
        if (sm !== null && em !== null && fm !== null && wfm !== null &&
            Math.abs(sm - em) <= 5 && Math.abs(fm - wfm) <= 5) days_match++
        else days_mismatch++
      })

      const total_days = days_match + days_mismatch + days_missing
      const total_mins = tsEntries.reduce((s, e) => s + parseHHMM(e.total_hours), 0)

      return {
        ...sub,
        total_days_worked: total_days,
        days_match,
        days_mismatch,
        days_missing,
        total_hours: minsToHHMM(total_mins),
        verification_status: total_days === 0 ? 'incomplete'
          : (days_mismatch > 0 || days_missing > 0) ? 'discrepancies_found'
          : 'verified'
      }
    })

    return reply.send({ summaries })
  })

  // Every active worker's White/Orange/Green paper hour totals for a month — for the
  // "download everyone's hours in one file" payroll export
  fastify.get('/api/payroll/hours-summary/:month/:year', { onRequest: [isPayroll] }, async (request, reply) => {
    const { month, year } = request.params

    const workersResult = await db.query(
      `SELECT id, work_number, full_name FROM workers
       WHERE is_active = true AND work_number IS NOT NULL AND work_number != ''
       ORDER BY CASE WHEN work_number ~ '^[0-9]+$' THEN work_number::int ELSE 9999 END ASC`
    )
    const workers = workersResult.rows
    if (!workers.length) return reply.send({ summary: [] })

    const workerIds = workers.map(w => w.id)

    const [tsResult, greenResult] = await Promise.all([
      db.query(
        `SELECT worker_id, white_hours, orange_hours
         FROM timesheet_entries
         WHERE worker_id = ANY($1) AND EXTRACT(MONTH FROM entry_date) = $2 AND EXTRACT(YEAR FROM entry_date) = $3`,
        [workerIds, month, year]
      ),
      db.query(
        `SELECT worker_id, start_time, finish_time
         FROM green_paper_entries
         WHERE worker_id = ANY($1) AND EXTRACT(MONTH FROM entry_date) = $2 AND EXTRACT(YEAR FROM entry_date) = $3`,
        [workerIds, month, year]
      )
    ])

    const totalsByWorker = {}
    tsResult.rows.forEach(e => {
      if (!totalsByWorker[e.worker_id]) totalsByWorker[e.worker_id] = { white: 0, orange: 0, green: 0 }
      totalsByWorker[e.worker_id].white += parseHHMM(e.white_hours)
      totalsByWorker[e.worker_id].orange += parseHHMM(e.orange_hours)
    })
    greenResult.rows.forEach(e => {
      if (!totalsByWorker[e.worker_id]) totalsByWorker[e.worker_id] = { white: 0, orange: 0, green: 0 }
      const dur = toMins(e.finish_time) - toMins(e.start_time)
      if (e.start_time && e.finish_time && dur > 0) totalsByWorker[e.worker_id].green += dur
    })

    const summary = workers.map(w => {
      const t = totalsByWorker[w.id] || { white: 0, orange: 0, green: 0 }
      return {
        worker_id: w.id,
        work_number: w.work_number,
        full_name: w.full_name,
        white_hours: minsToHHMM(t.white),
        orange_hours: minsToHHMM(t.orange),
        green_hours: minsToHHMM(t.green),
        total_hours: minsToHHMM(t.white + t.orange + t.green)
      }
    })

    return reply.send({ summary })
  })

  // Delete a submission
  fastify.delete('/api/payroll/submissions/:id', { onRequest: [isPayroll] }, async (request, reply) => {
    await db.query('DELETE FROM worker_submissions WHERE id = $1', [request.params.id])
    return reply.send({ success: true })
  })

  // Update submission status
  fastify.post('/api/payroll/submissions/:id/status', { onRequest: [isPayroll] }, async (request, reply) => {
    const { status } = request.body
    const valid = ['submitted', 'approved', 'rejected', 'needs_review']
    if (!valid.includes(status)) {
      return reply.status(400).send({ error: 'Invalid status. Must be: ' + valid.join(', ') })
    }
    await db.query('UPDATE worker_submissions SET status = $1 WHERE id = $2', [status, request.params.id])
    return reply.send({ success: true })
  })

}
