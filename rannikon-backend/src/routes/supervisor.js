'use strict'

const db = require('../db/index')

function toMins(t) {
  if (!t) return 0
  const p = t.slice(0, 5).split(':')
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
  const totalBreak = Math.max(30, breakMins || 30)
  const extraBreak = totalBreak - 30
  const whiteFinish = addMins(actualStart, 510)
  const workedMins = toMins(actualFinish) - toMins(actualStart)
  if (workedMins < 510) {
    const wHours = toHHMM(Math.max(0, workedMins - totalBreak))
    return { white_hours: wHours, orange_hours: '0:00', total_hours: wHours, white_finish: actualFinish, orange_start: actualFinish }
  }
  const orangeMins = Math.max(0, toMins(actualFinish) - toMins(whiteFinish) - extraBreak)
  return {
    white_hours: '8:00',
    white_finish: whiteFinish,
    orange_start: whiteFinish,
    orange_hours: toHHMM(orangeMins),
    total_hours: toHHMM(480 + orangeMins)
  }
}

function getHouseGroup(workNumber) {
  const n = parseInt(workNumber)
  if (n >= 100 && n <= 199) return 'Kivilinna/Salo'
  if (n >= 200 && n <= 299) return 'Karton Cambodia'
  if (n >= 300 && n <= 399) return 'Karton International'
  if (n >= 400 && n <= 499) return 'Vassila'
  if (n >= 500 && n <= 599) return 'Suppala'
  if (n >= 600) return 'Salo/Turku'
  return 'Unknown'
}

module.exports = async function supervisorRoutes(fastify) {

  async function requireSupervisor(request, reply) {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
    const result = await db.query('SELECT role FROM workers WHERE id = $1', [request.user.id])
    if (!result.rows[0] || !['supervisor', 'admin'].includes(result.rows[0].role)) {
      return reply.status(403).send({ error: 'Supervisor access required' })
    }
  }

  // Get or create today's session
  fastify.post('/api/supervisor/session', {
    onRequest: [requireSupervisor]
  }, async (request, reply) => {
    const existing = await db.query(
      "SELECT id, total_break_mins, status FROM supervisor_sessions WHERE supervisor_id = $1 AND session_date = CURRENT_DATE AND status = 'open'",
      [request.user.id]
    )
    if (existing.rows[0]) return reply.send({ session: existing.rows[0] })
    const result = await db.query(
      'INSERT INTO supervisor_sessions (supervisor_id) VALUES ($1) RETURNING *',
      [request.user.id]
    )
    return reply.send({ session: result.rows[0] })
  })

  // Get today's session (read-only)
  fastify.get('/api/supervisor/session/today', {
    onRequest: [requireSupervisor]
  }, async (request, reply) => {
    const result = await db.query(
      `SELECT s.*, w.full_name as supervisor_name,
        (SELECT COUNT(*) FROM supervisor_logs WHERE session_id = s.id) as worker_count
       FROM supervisor_sessions s
       JOIN workers w ON w.id = s.supervisor_id
       WHERE s.supervisor_id = $1 AND s.session_date = CURRENT_DATE
       ORDER BY s.created_at DESC LIMIT 1`,
      [request.user.id]
    )
    return reply.send({ session: result.rows[0] || null })
  })

  // Add a batch (multiple workers, same start time)
  fastify.post('/api/supervisor/batch', {
    onRequest: [requireSupervisor]
  }, async (request, reply) => {
    const { session_id, worker_numbers, start_time, what_work } = request.body
    if (!session_id || !worker_numbers?.length || !start_time) {
      return reply.status(400).send({ error: 'session_id, worker_numbers and start_time required' })
    }

    const batch = await db.query(
      'INSERT INTO supervisor_batches (session_id, worker_numbers, start_time) VALUES ($1, $2, $3) RETURNING *',
      [session_id, worker_numbers, start_time]
    )

    for (const wn of worker_numbers) {
      const workerResult = await db.query('SELECT full_name FROM workers WHERE work_number = $1', [wn])
      await db.query(
        `INSERT INTO supervisor_logs (session_id, worker_number, worker_name, house_group, start_time, what_work)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [session_id, wn, workerResult.rows[0]?.full_name || '', getHouseGroup(wn), start_time, what_work || '']
      )
    }

    return reply.send({ batch: batch.rows[0] })
  })

  // Record a break (adds to session total)
  fastify.post('/api/supervisor/break', {
    onRequest: [requireSupervisor]
  }, async (request, reply) => {
    const { session_id, break_mins } = request.body
    if (!session_id || !break_mins) return reply.status(400).send({ error: 'session_id and break_mins required' })
    await db.query(
      'UPDATE supervisor_sessions SET total_break_mins = total_break_mins + $1 WHERE id = $2',
      [parseInt(break_mins), session_id]
    )
    const result = await db.query('SELECT total_break_mins FROM supervisor_sessions WHERE id = $1', [session_id])
    return reply.send({ total_break_mins: result.rows[0].total_break_mins })
  })

  // Set finish time for a batch — updates all workers in it
  fastify.patch('/api/supervisor/batch/:batch_id/finish', {
    onRequest: [requireSupervisor]
  }, async (request, reply) => {
    const { finish_time } = request.body
    const { batch_id } = request.params
    if (!finish_time) return reply.status(400).send({ error: 'finish_time required' })

    const batchRes = await db.query('SELECT * FROM supervisor_batches WHERE id = $1', [batch_id])
    if (!batchRes.rows[0]) return reply.status(404).send({ error: 'Batch not found' })
    const batch = batchRes.rows[0]

    await db.query('UPDATE supervisor_batches SET finish_time = $1 WHERE id = $2', [finish_time, batch_id])

    const sessionRes = await db.query('SELECT total_break_mins FROM supervisor_sessions WHERE id = $1', [batch.session_id])
    const breakMins = sessionRes.rows[0]?.total_break_mins || 30

    const sessionDate = await db.query('SELECT session_date FROM supervisor_sessions WHERE id = $1', [batch.session_id])
    const dateStr = sessionDate.rows[0]?.session_date?.toISOString?.()?.split('T')[0] || new Date().toISOString().split('T')[0]

    for (const wn of batch.worker_numbers) {
      const calc = calculate(batch.start_time, finish_time, breakMins)

      await db.query(
        `UPDATE supervisor_logs SET
           finish_time = $1, total_break_mins = $2,
           white_hours = $3, orange_hours = $4, total_hours = $5
         WHERE session_id = $6 AND worker_number = $7`,
        [finish_time, breakMins, calc.white_hours, calc.orange_hours, calc.total_hours, batch.session_id, wn]
      )

      // Auto-fill the worker's timesheet entry
      const workerRes = await db.query('SELECT id FROM workers WHERE work_number = $1', [wn])
      if (workerRes.rows[0]) {
        const wid = workerRes.rows[0].id
        const entryDate = dateStr + 'T12:00:00.000Z'
        await db.query(
          `INSERT INTO timesheet_entries
             (worker_id, entry_date, actual_start, actual_finish, what_work, break_mins,
              white_start, white_finish, white_hours,
              orange_start, orange_finish, orange_hours, total_hours)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (worker_id, entry_date) DO UPDATE SET
             actual_start=$3, actual_finish=$4, what_work=$5, break_mins=$6,
             white_start=$7, white_finish=$8, white_hours=$9,
             orange_start=$10, orange_finish=$11, orange_hours=$12,
             total_hours=$13, updated_at=now()`,
          [wid, entryDate,
           batch.start_time, finish_time,
           batch.what_work || '', breakMins,
           batch.start_time, calc.white_finish, calc.white_hours,
           calc.orange_start, finish_time, calc.orange_hours, calc.total_hours]
        )
      }
    }

    return reply.send({ success: true })
  })

  // Update what_work for a batch
  fastify.patch('/api/supervisor/batch/:batch_id/work', {
    onRequest: [requireSupervisor]
  }, async (request, reply) => {
    const { what_work } = request.body
    const { batch_id } = request.params
    const batchRes = await db.query('SELECT * FROM supervisor_batches WHERE id = $1', [batch_id])
    if (!batchRes.rows[0]) return reply.status(404).send({ error: 'Batch not found' })
    await db.query(
      'UPDATE supervisor_logs SET what_work = $1 WHERE session_id = $2 AND worker_number = ANY($3)',
      [what_work, batchRes.rows[0].session_id, batchRes.rows[0].worker_numbers]
    )
    return reply.send({ success: true })
  })

  // Get all batches for a session
  fastify.get('/api/supervisor/session/:session_id/batches', {
    onRequest: [requireSupervisor]
  }, async (request, reply) => {
    const batches = await db.query(
      'SELECT * FROM supervisor_batches WHERE session_id = $1 ORDER BY created_at ASC',
      [request.params.session_id]
    )
    return reply.send({ batches: batches.rows })
  })

  // Get full worklog for a session
  fastify.get('/api/supervisor/session/:session_id/logs', {
    onRequest: [requireSupervisor]
  }, async (request, reply) => {
    const logs = await db.query(
      'SELECT * FROM supervisor_logs WHERE session_id = $1 ORDER BY house_group, start_time, worker_number ASC',
      [request.params.session_id]
    )
    const session = await db.query(
      'SELECT s.*, w.full_name as supervisor_name FROM supervisor_sessions s JOIN workers w ON w.id = s.supervisor_id WHERE s.id = $1',
      [request.params.session_id]
    )
    return reply.send({ logs: logs.rows, session: session.rows[0] })
  })

  // Delete a worker from a batch/session
  fastify.delete('/api/supervisor/session/:session_id/log/:worker_number', {
    onRequest: [requireSupervisor]
  }, async (request, reply) => {
    await db.query(
      'DELETE FROM supervisor_logs WHERE session_id = $1 AND worker_number = $2',
      [request.params.session_id, request.params.worker_number]
    )
    return reply.send({ success: true })
  })

  // Send worklog to admin via email
  fastify.post('/api/supervisor/session/:session_id/send-to-admin', {
    onRequest: [requireSupervisor]
  }, async (request, reply) => {
    const { Resend } = require('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const logsRes = await db.query(
      'SELECT * FROM supervisor_logs WHERE session_id = $1 ORDER BY house_group, start_time, worker_number ASC',
      [request.params.session_id]
    )
    const sessionRes = await db.query(
      'SELECT s.*, w.full_name as supervisor_name FROM supervisor_sessions s JOIN workers w ON w.id = s.supervisor_id WHERE s.id = $1',
      [request.params.session_id]
    )

    const s = sessionRes.rows[0]
    const rows = logsRes.rows
    const dateLabel = s.session_date ? new Date(s.session_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : ''

    const tableRows = rows.map(r =>
      `<tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:6px 10px;font-weight:700">${r.worker_number}</td>
        <td style="padding:6px 10px">${r.worker_name || ''}</td>
        <td style="padding:6px 10px;color:#555">${r.house_group}</td>
        <td style="padding:6px 10px">${r.start_time?.slice(0,5) || ''}</td>
        <td style="padding:6px 10px">${r.finish_time?.slice(0,5) || ''}</td>
        <td style="padding:6px 10px">${r.total_break_mins} min</td>
        <td style="padding:6px 10px;font-weight:700;color:#2d6a2d">${r.total_hours || ''}</td>
        <td style="padding:6px 10px;color:#555">${r.what_work || ''}</td>
      </tr>`
    ).join('')

    const admins = await db.query("SELECT email FROM workers WHERE role = 'admin'")
    if (!admins.rows.length) return reply.status(400).send({ error: 'No admin email found' })

    for (const admin of admins.rows) {
      await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: admin.email,
        subject: `Work log: ${s.supervisor_name} | ${dateLabel}`,
        html: `<div style="font-family:sans-serif;max-width:820px;margin:0 auto;padding:24px">
          <div style="margin-bottom:20px">
            <img src="https://www.rannikon.com/rannikkopuutarhalogo.png" alt="Rannikon" style="height:40px"/>
          </div>
          <h2 style="color:#2d6a2d;margin:0 0 6px">Work Log</h2>
          <p style="margin:0 0 16px;color:#555">${dateLabel}</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
            <tr style="background:#f5f5f0">
              <td style="padding:8px 10px">Supervisor</td><td style="padding:8px 10px;font-weight:700">${s.supervisor_name}</td>
              <td style="padding:8px 10px">Total break</td><td style="padding:8px 10px;font-weight:700">${s.total_break_mins} min</td>
              <td style="padding:8px 10px">Workers</td><td style="padding:8px 10px;font-weight:700">${rows.length}</td>
            </tr>
          </table>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#2d6a2d;color:#fff">
                <th style="padding:8px 10px;text-align:left">Work#</th>
                <th style="padding:8px 10px;text-align:left">Name</th>
                <th style="padding:8px 10px;text-align:left">Group</th>
                <th style="padding:8px 10px;text-align:left">Start</th>
                <th style="padding:8px 10px;text-align:left">Finish</th>
                <th style="padding:8px 10px;text-align:left">Break</th>
                <th style="padding:8px 10px;text-align:left">Total hrs</th>
                <th style="padding:8px 10px;text-align:left">Work done</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>`
      })
    }

    await db.query('UPDATE supervisor_logs SET sent_to_admin = true WHERE session_id = $1', [request.params.session_id])
    await db.query("UPDATE supervisor_sessions SET status = 'sent' WHERE id = $1", [request.params.session_id])

    return reply.send({ success: true, sent_to: admins.rows.length })
  })

  // Admin: get all supervisor logs for a date
  fastify.get('/api/supervisor/admin/logs/:date', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const result = await db.query(
      `SELECT sl.*, w.full_name as supervisor_name, ss.total_break_mins as session_break, ss.session_date
       FROM supervisor_logs sl
       JOIN supervisor_sessions ss ON ss.id = sl.session_id
       JOIN workers w ON w.id = ss.supervisor_id
       WHERE ss.session_date = $1
       ORDER BY sl.house_group, sl.start_time, sl.worker_number`,
      [request.params.date]
    )
    return reply.send({ logs: result.rows })
  })
}
