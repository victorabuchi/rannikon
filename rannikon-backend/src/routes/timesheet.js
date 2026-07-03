'use strict'

const db = require('../db/index')

function toMins(t) {
  const p = t.split(':')
  return parseInt(p[0]) * 60 + parseInt(p[1])
}

function toHHMM(m) {
  if (m <= 0) return '0:00'
  return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0')
}

function addMins(t, add) {
  const total = toMins(t) + add
  return String(Math.floor(total / 60) % 24).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0')
}

function calculate(actualStart, actualFinish, breakMins) {
  const totalBreak = Math.max(0, breakMins || 0)
  const extraBreak = Math.max(0, totalBreak - 30)

  const workedMins = toMins(actualFinish) - toMins(actualStart)
  const WHITE_WINDOW = totalBreak >= 30 ? 510 : 480

  const whiteStart = actualStart

  if (workedMins <= WHITE_WINDOW) {
    const whiteHours = toHHMM(Math.max(0, workedMins - totalBreak))
    return {
      white_start: whiteStart,
      white_finish: actualFinish,
      white_hours: whiteHours,
      extra_break: toHHMM(extraBreak),
      orange_start: actualFinish,
      orange_finish: actualFinish,
      orange_hours: '0:00',
      orange_break: toHHMM(extraBreak),
      total_hours: whiteHours
    }
  }

  const whiteFinish = addMins(actualStart, WHITE_WINDOW)
  const orangeStart = whiteFinish
  const orangeMins = Math.max(0, toMins(actualFinish) - toMins(orangeStart) - extraBreak)
  const orangeHours = toHHMM(orangeMins)
  const totalHours = toHHMM(480 + orangeMins)

  return {
    white_start: whiteStart,
    white_finish: whiteFinish,
    white_hours: '8:00',
    extra_break: toHHMM(extraBreak),
    orange_start: orangeStart,
    orange_finish: actualFinish,
    orange_hours: orangeHours,
    orange_break: toHHMM(extraBreak),
    total_hours: totalHours
  }
}

module.exports = async function timesheetRoutes(fastify) {

  fastify.get('/api/timesheet/:month/:year', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { month, year } = request.params
    const result = await db.query(
      `SELECT * FROM timesheet_entries
       WHERE worker_id = $1
       AND EXTRACT(MONTH FROM entry_date) = $2
       AND EXTRACT(YEAR FROM entry_date) = $3
       ORDER BY entry_date ASC`,
      [request.user.id, month, year]
    )
    return reply.send({ entries: result.rows })
  })

  fastify.post('/api/timesheet/entry', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { entry_date, actual_start, actual_finish, what_work, break_mins } = request.body

    if (!entry_date || !actual_start || !actual_finish) {
      return reply.status(400).send({ error: 'Date, start time and finish time are required' })
    }

    const calc = calculate(actual_start, actual_finish, break_mins ?? 0)

    const result = await db.query(
      `INSERT INTO timesheet_entries
       (worker_id, entry_date, actual_start, actual_finish, what_work, break_mins,
        white_start, white_finish, white_hours,
        orange_start, orange_finish, orange_hours, total_hours)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (worker_id, entry_date)
       DO UPDATE SET
         actual_start = $3, actual_finish = $4, what_work = $5, break_mins = $6,
         white_start = $7, white_finish = $8, white_hours = $9,
         orange_start = $10, orange_finish = $11, orange_hours = $12,
         total_hours = $13, updated_at = now()
       RETURNING *`,
      [
        request.user.id, entry_date, actual_start, actual_finish,
        what_work || '', break_mins ?? 0,
        calc.white_start, calc.white_finish, calc.white_hours,
        calc.orange_start, calc.orange_finish, calc.orange_hours, calc.total_hours
      ]
    )

    return reply.send({ entry: result.rows[0] })
  })

  fastify.patch('/api/timesheet/entry/:date/field', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { field, value } = request.body
    const dateStr = request.params.date.split('T')[0]

    const allowed = [
      'white_start', 'white_finish', 'white_hours',
      'orange_start', 'orange_finish', 'orange_hours',
      'total_hours', 'what_work', 'actual_start', 'actual_finish'
    ]

    if (!allowed.includes(field)) {
      return reply.status(400).send({ error: 'Field not allowed' })
    }

    await db.query(
      `UPDATE timesheet_entries SET ${field} = $1, updated_at = now()
       WHERE worker_id = $2 AND entry_date::date = $3::date`,
      [value, request.user.id, dateStr]
    )

    return reply.send({ success: true })
  })

  fastify.delete('/api/timesheet/entry/:date', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const dateStr = request.params.date.split('T')[0]
      console.log('DELETE entry:', { worker_id: request.user.id, dateStr })
      const result = await db.query(
        'DELETE FROM timesheet_entries WHERE worker_id = $1 AND entry_date::date = $2::date',
        [request.user.id, dateStr]
      )
      console.log('DELETE result:', result.rowCount)
      return reply.send({ success: true })
    } catch (err) {
      console.error('DELETE error:', err.message)
      return reply.status(500).send({ error: err.message })
    }
  })

  fastify.get('/api/timesheet/self-verify/:month/:year', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { month, year } = request.params
      const workerResult = await db.query('SELECT work_number FROM workers WHERE id = $1', [request.user.id])
      const worker = workerResult.rows[0]
      if (!worker) return reply.status(404).send({ error: 'Worker not found' })

      const [tsResult, supResult] = await Promise.all([
        db.query(
          `SELECT entry_date, actual_start, actual_finish, break_mins, total_hours
           FROM timesheet_entries
           WHERE worker_id = $1 AND EXTRACT(MONTH FROM entry_date) = $2 AND EXTRACT(YEAR FROM entry_date) = $3
           ORDER BY entry_date ASC`,
          [request.user.id, month, year]
        ),
        db.query(
          `SELECT sl.start_time, sl.finish_time, sl.total_break_mins, sl.total_hours, ss.session_date
           FROM supervisor_logs sl
           JOIN supervisor_sessions ss ON ss.id = sl.session_id
           WHERE sl.worker_number = $1 AND EXTRACT(MONTH FROM ss.session_date) = $2 AND EXTRACT(YEAR FROM ss.session_date) = $3
           ORDER BY ss.session_date ASC`,
          [worker.work_number, month, year]
        )
      ])

      const tsMap = {}
      tsResult.rows.forEach(e => { tsMap[String(e.entry_date).split('T')[0]] = e })
      const supMap = {}
      supResult.rows.forEach(e => { supMap[String(e.session_date).split('T')[0]] = e })

      const allDates = Array.from(new Set([...Object.keys(tsMap), ...Object.keys(supMap)])).sort()
      let days_match = 0, days_mismatch = 0, days_missing = 0

      const matches = allDates.map(date => {
        const sup = supMap[date], entry = tsMap[date]
        if (!sup && !entry) return null
        let status
        if (!sup) { status = 'missing_supervisor'; days_missing++ }
        else if (!entry) { status = 'missing_worker'; days_missing++ }
        else {
          const sm = toMins2(String(sup.start_time).slice(0, 5))
          const em = toMins2(String(entry.actual_start).slice(0, 5))
          const fm = toMins2(String(sup.finish_time).slice(0, 5))
          const wfm = toMins2(String(entry.actual_finish).slice(0, 5))
          status = Math.abs(sm - em) <= 5 && Math.abs(fm - wfm) <= 5 ? 'match' : 'mismatch'
          if (status === 'match') days_match++; else days_mismatch++
        }
        return {
          date,
          supervisor_recorded: sup ? {
            start: String(sup.start_time).slice(0, 5),
            finish: String(sup.finish_time).slice(0, 5),
            break: sup.total_break_mins,
            total: sup.total_hours
          } : null,
          worker_submitted: entry ? {
            start: String(entry.actual_start).slice(0, 5),
            finish: String(entry.actual_finish).slice(0, 5),
            break: entry.break_mins,
            total: entry.total_hours
          } : null,
          status
        }
      }).filter(Boolean)

      const total_days_worked = days_match + days_mismatch + days_missing
      const total_mins = tsResult.rows.reduce((s, e) => s + toMins2(e.total_hours), 0)

      return reply.send({
        matches,
        summary: {
          total_days_worked,
          days_match,
          days_mismatch,
          days_missing,
          total_hours: toHHMM2(total_mins),
          verification_status: total_days_worked === 0 ? 'incomplete'
            : (days_mismatch > 0 || days_missing > 0) ? 'discrepancies_found'
            : 'verified'
        }
      })
    } catch (err) {
      fastify.log.error(err)
      return reply.status(500).send({ error: err.message })
    }
  })

  fastify.get('/api/timesheet/my-submissions', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const result = await db.query(
      `SELECT id, month, year, papers_included, notes, status, submitted_at
       FROM worker_submissions
       WHERE worker_id = $1
       ORDER BY submitted_at DESC`,
      [request.user.id]
    )
    return reply.send({ submissions: result.rows })
  })

  fastify.post('/api/timesheet/submit-to-payroll', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
    const { month, year, papers, notes } = request.body
    if (!month || !year) return reply.status(400).send({ error: 'month and year are required' })
    if (!papers || !papers.length) return reply.status(400).send({ error: 'At least one paper must be selected' })

    const workerResult = await db.query(
      'SELECT id, work_number, full_name, email, house_group FROM workers WHERE id = $1',
      [request.user.id]
    )
    const worker = workerResult.rows[0]

    let white_data = null, orange_data = null, weekly_data = null, green_data = null

    if (papers.includes('white') || papers.includes('orange') || papers.includes('weekly')) {
      const tsResult = await db.query(
        `SELECT * FROM timesheet_entries
         WHERE worker_id = $1
         AND EXTRACT(MONTH FROM entry_date) = $2
         AND EXTRACT(YEAR FROM entry_date) = $3
         ORDER BY entry_date ASC`,
        [request.user.id, month, year]
      )
      const entries = tsResult.rows
      if (papers.includes('white')) white_data = entries
      if (papers.includes('orange')) orange_data = entries.filter(e => e.orange_hours && e.orange_hours !== '0:00' && e.orange_hours !== '0:0')
      if (papers.includes('weekly')) weekly_data = entries
    }

    if (papers.includes('green')) {
      const greenResult = await db.query(
        `SELECT * FROM green_paper_entries
         WHERE worker_id = $1
         AND EXTRACT(MONTH FROM entry_date) = $2
         AND EXTRACT(YEAR FROM entry_date) = $3
         ORDER BY entry_date ASC`,
        [request.user.id, month, year]
      )
      green_data = greenResult.rows
    }

    const allEntries = white_data || weekly_data || []
    const totalWhiteMins = allEntries.reduce((s, e) => s + toMins2(e.white_hours), 0)
    const totalOrangeMins = allEntries.reduce((s, e) => s + toMins2(e.orange_hours), 0)
    const totalMins = allEntries.reduce((s, e) => s + toMins2(e.total_hours), 0)

    const result = await db.query(
      `INSERT INTO worker_submissions
       (worker_id, month, year, papers_included, white_paper_data, orange_paper_data, weekly_data, green_paper_data, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'submitted')
       RETURNING id`,
      [
        request.user.id, month, year, papers,
        white_data ? JSON.stringify(white_data) : null,
        orange_data ? JSON.stringify(orange_data) : null,
        weekly_data ? JSON.stringify(weekly_data) : null,
        green_data ? JSON.stringify(green_data) : null,
        notes || null
      ]
    )
    const submission_id = result.rows[0].id

    const payrollUsers = await db.query(
      "SELECT email, full_name FROM workers WHERE role = 'payroll' AND is_active = true"
    )

    if (payrollUsers.rows.length > 0) {
      const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
      const monthLabel = MONTHS[parseInt(month) - 1] + ' ' + year
      const paperLabels = { white: 'White paper', orange: 'Orange paper', weekly: 'Weekly summary', green: 'Green paper' }
      const papersLabel = papers.map(p => paperLabels[p] || p).join(', ')

      const { Resend } = require('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      for (const pu of payrollUsers.rows) {
        await resend.emails.send({
          from: process.env.RESEND_FROM,
          to: pu.email,
          subject: `Monthly submission from ${worker.full_name} #${worker.work_number} — ${monthLabel}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
              <img src="https://www.rannikon.com/rannikkopuutarhalogo.png" alt="Rannikon" style="height:40px;margin-bottom:16px"/>
              <h2 style="color:#2d6a2d;margin:0 0 4px">Monthly Paper Submission</h2>
              <p style="color:#555;margin:0 0 20px;font-size:14px">${monthLabel}</p>
              <table style="width:100%;border-collapse:collapse;font-size:14px">
                <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;width:140px">Worker</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:700">${worker.full_name}</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">Work number</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:700">#${worker.work_number}</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">House group</td><td style="padding:8px;border-bottom:1px solid #eee">${worker.house_group || '—'}</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">Papers included</td><td style="padding:8px;border-bottom:1px solid #eee">${papersLabel}</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">Regular hours</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:700;color:#2d6a2d">${toHHMM2(totalWhiteMins)}</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">Extra hours</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:700;color:#b45309">${toHHMM2(totalOrangeMins)}</td></tr>
                <tr><td style="padding:8px;color:#888">Total hours</td><td style="padding:8px;font-weight:700;font-size:16px">${toHHMM2(totalMins)}</td></tr>
              </table>
              ${notes ? `<p style="margin-top:16px;padding:12px;background:#f5f5f5;border-radius:8px;font-size:13px;color:#555"><b>Notes:</b> ${notes}</p>` : ''}
              <p style="font-size:12px;color:#999;margin-top:20px">Log in to view and verify this submission: <a href="https://www.rannikon.com/payroll" style="color:#2d6a2d">www.rannikon.com/payroll</a></p>
            </div>
          `
        })
      }
    }

    return reply.send({ success: true, submission_id })
    } catch (err) {
      fastify.log.error(err)
      return reply.status(500).send({ error: err.message || 'Internal Server Error' })
    }
  })

}

function toMins2(t) {
  if (!t) return 0
  const parts = String(t).split(':')
  return parseInt(parts[0]) * 60 + (parseInt(parts[1]) || 0)
}

function toHHMM2(m) {
  if (!m || m <= 0) return '0:00'
  return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0')
}