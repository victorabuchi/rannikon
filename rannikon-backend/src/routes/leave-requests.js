'use strict'

const db = require('../db/index')

const REQUEST_TYPES = ['holiday', 'break', 'leave', 'other']

function emailWrapper(title, rows) {
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
    <img src="https://www.rannikon.com/rannikkopuutarhalogo.png" alt="Rannikon" style="height:40px;margin-bottom:16px"/>
    <h2 style="color:#2d6a2d;margin:0 0 16px">${title}</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
      ${rows.map(([label, value]) => `<tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:8px 10px;color:#888">${label}</td>
        <td style="padding:8px 10px;font-weight:700">${value}</td>
      </tr>`).join('')}
    </table>
    <p style="font-size:12px;color:#999">
      Log in to Rannikon to review it: <a href="https://www.rannikon.com" style="color:#2d6a2d">www.rannikon.com</a>
    </p>
  </div>`
}

module.exports = async function leaveRequestRoutes(fastify) {

  async function isAdmin(request, reply) {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
    const result = await db.query('SELECT role FROM workers WHERE id = $1', [request.user.id])
    if (!result.rows[0] || result.rows[0].role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }
  }

  // Worker: submit a new request
  fastify.post('/api/leave-requests', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { request_type, reason, start_date, end_date } = request.body || {}
    if (!REQUEST_TYPES.includes(request_type)) {
      return reply.status(400).send({ error: 'Invalid request_type' })
    }
    if (!start_date || !end_date || new Date(start_date) > new Date(end_date)) {
      return reply.status(400).send({ error: 'start_date must be on or before end_date' })
    }

    const workerRes = await db.query('SELECT full_name, work_number, house_group FROM workers WHERE id = $1', [request.user.id])
    const worker = workerRes.rows[0]
    if (!worker) return reply.status(404).send({ error: 'Worker not found' })

    const inserted = await db.query(
      `INSERT INTO leave_requests (worker_id, house_group, request_type, reason, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [request.user.id, worker.house_group, request_type, reason || null, start_date, end_date]
    )

    const housemasters = await db.query(
      "SELECT email FROM workers WHERE role = 'housemaster' AND house_group = $1 AND is_active = true",
      [worker.house_group]
    )
    if (housemasters.rows.length) {
      const { Resend } = require('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const html = emailWrapper('New leave request', [
        ['Worker', `#${worker.work_number} ${worker.full_name}`],
        ['Type', request_type],
        ['Period', `${start_date} to ${end_date}`],
        ['Reason', reason || '—'],
      ])
      for (const hm of housemasters.rows) {
        await resend.emails.send({
          from: process.env.RESEND_FROM,
          to: hm.email,
          subject: `New leave request — #${worker.work_number} ${worker.full_name}`,
          html
        })
      }
    }

    return reply.send({ request: inserted.rows[0] })
  })

  // Worker: view their own requests
  fastify.get('/api/leave-requests/mine', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const result = await db.query(
      'SELECT * FROM leave_requests WHERE worker_id = $1 ORDER BY created_at DESC',
      [request.user.id]
    )
    return reply.send({ requests: result.rows })
  })

  // Housemaster/admin: view requests pending at the housemaster stage
  fastify.get('/api/leave-requests/housemaster', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const worker = await db.query('SELECT role, house_group FROM workers WHERE id = $1', [request.user.id])
    const w = worker.rows[0]
    if (!w || !['housemaster', 'admin'].includes(w.role)) {
      return reply.status(403).send({ error: 'Access denied' })
    }
    const params = ["pending_housemaster"]
    let where = 'lr.status = $1'
    if (w.role === 'housemaster') {
      params.push(w.house_group)
      where += ' AND lr.house_group = $2'
    }
    const result = await db.query(
      `SELECT lr.*, w.full_name, w.work_number
       FROM leave_requests lr JOIN workers w ON w.id = lr.worker_id
       WHERE ${where} ORDER BY lr.created_at ASC`,
      params
    )
    return reply.send({ requests: result.rows })
  })

  // Housemaster/admin: forward a request on to admin
  fastify.post('/api/leave-requests/:id/forward', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const worker = await db.query('SELECT role, house_group FROM workers WHERE id = $1', [request.user.id])
    const w = worker.rows[0]
    if (!w || !['housemaster', 'admin'].includes(w.role)) {
      return reply.status(403).send({ error: 'Access denied' })
    }

    const existing = await db.query('SELECT * FROM leave_requests WHERE id = $1', [request.params.id])
    const row = existing.rows[0]
    if (!row) return reply.status(404).send({ error: 'Request not found' })
    if (row.status !== 'pending_housemaster') return reply.status(409).send({ error: 'Request already processed' })
    if (w.role === 'housemaster' && row.house_group !== w.house_group) {
      return reply.status(403).send({ error: 'Access denied' })
    }

    await db.query(
      "UPDATE leave_requests SET status = 'pending_admin', forwarded_by = $1, forwarded_at = now() WHERE id = $2",
      [request.user.id, request.params.id]
    )

    const [workerRes, admins] = await Promise.all([
      db.query('SELECT full_name, work_number FROM workers WHERE id = $1', [row.worker_id]),
      db.query("SELECT email FROM workers WHERE role = 'admin' AND is_active = true")
    ])
    const requester = workerRes.rows[0]
    if (admins.rows.length) {
      const { Resend } = require('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const html = emailWrapper('Leave request forwarded for approval', [
        ['Worker', `#${requester.work_number} ${requester.full_name}`],
        ['Type', row.request_type],
        ['Period', `${row.start_date} to ${row.end_date}`],
        ['Reason', row.reason || '—'],
      ])
      for (const admin of admins.rows) {
        await resend.emails.send({
          from: process.env.RESEND_FROM,
          to: admin.email,
          subject: `Leave request forwarded — #${requester.work_number} ${requester.full_name}`,
          html
        })
      }
    }

    return reply.send({ success: true })
  })

  // Admin: view requests pending final decision
  fastify.get('/api/leave-requests/admin', { onRequest: [isAdmin] }, async (request, reply) => {
    const result = await db.query(
      `SELECT lr.*, w.full_name, w.work_number, w.house_group AS worker_house_group, fw.full_name AS forwarded_by_name
       FROM leave_requests lr
       JOIN workers w ON w.id = lr.worker_id
       LEFT JOIN workers fw ON fw.id = lr.forwarded_by
       WHERE lr.status = 'pending_admin'
       ORDER BY lr.forwarded_at ASC`
    )
    return reply.send({ requests: result.rows })
  })

  // Admin: approve or reject
  fastify.post('/api/leave-requests/:id/decide', { onRequest: [isAdmin] }, async (request, reply) => {
    const { decision, note } = request.body || {}
    if (!['approved', 'rejected'].includes(decision)) {
      return reply.status(400).send({ error: 'decision must be approved or rejected' })
    }

    const existing = await db.query('SELECT * FROM leave_requests WHERE id = $1', [request.params.id])
    const row = existing.rows[0]
    if (!row) return reply.status(404).send({ error: 'Request not found' })
    if (row.status !== 'pending_admin') return reply.status(409).send({ error: 'Request already processed' })

    await db.query(
      'UPDATE leave_requests SET status = $1, decided_by = $2, decided_at = now(), decision_note = $3 WHERE id = $4',
      [decision, request.user.id, note || null, request.params.id]
    )

    const requester = await db.query('SELECT email, full_name FROM workers WHERE id = $1', [row.worker_id])
    if (requester.rows[0]) {
      const { Resend } = require('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const rows = [
        ['Type', row.request_type],
        ['Period', `${row.start_date} to ${row.end_date}`],
        ['Decision', decision === 'approved' ? 'Approved' : 'Rejected'],
      ]
      if (note) rows.push(['Note', note])
      await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: requester.rows[0].email,
        subject: `Your leave request was ${decision}`,
        html: emailWrapper('Leave request update', rows)
      })
    }

    return reply.send({ success: true })
  })

}
