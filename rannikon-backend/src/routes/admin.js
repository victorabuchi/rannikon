'use strict'

const db = require('../db/index')

const HOUSE_GROUPS = [
  'Kivilinna/Salo',
  'Karton Cambodia',
  'Karton International',
  'Vassila',
  'Suppala',
  'Salo/Turku'
]

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

module.exports = async function adminRoutes(fastify) {

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

  fastify.get('/api/admin/workers', { onRequest: [isAdmin] }, async (request, reply) => {
    const result = await db.query(
      `SELECT id, work_number, full_name, email, role, is_active, house_group, created_at
       FROM workers ORDER BY
       CASE WHEN work_number ~ '^[0-9]+$' THEN work_number::int ELSE 9999 END ASC`
    )
    return reply.send({ workers: result.rows })
  })

  fastify.get('/api/admin/workers/:id/timesheet/:month/:year', { onRequest: [isAdmin] }, async (request, reply) => {
    const { id, month, year } = request.params
    const result = await db.query(
      `SELECT * FROM timesheet_entries
       WHERE worker_id = $1 AND EXTRACT(MONTH FROM entry_date) = $2 AND EXTRACT(YEAR FROM entry_date) = $3
       ORDER BY entry_date ASC`,
      [id, month, year]
    )
    return reply.send({ entries: result.rows })
  })

  fastify.patch('/api/admin/workers/:id', { onRequest: [isAdmin] }, async (request, reply) => {
    const { role, is_active, house_group } = request.body
    const updates = []
    const values = []
    let idx = 1
    if (role !== undefined) { updates.push(`role = $${idx++}`); values.push(role) }
    if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); values.push(is_active) }
    if (house_group !== undefined) { updates.push(`house_group = $${idx++}`); values.push(house_group) }
    if (!updates.length) return reply.status(400).send({ error: 'Nothing to update' })
    values.push(request.params.id)
    await db.query(`UPDATE workers SET ${updates.join(', ')} WHERE id = $${idx}`, values)
    return reply.send({ success: true })
  })

  fastify.get('/api/admin/stats', { onRequest: [isAdmin] }, async (request, reply) => {
    const workers = await db.query('SELECT COUNT(*) FROM workers')
    const active = await db.query("SELECT COUNT(*) FROM workers WHERE is_active = true")
    const entries = await db.query('SELECT COUNT(*) FROM timesheet_entries')
    const today = await db.query('SELECT COUNT(*) FROM timesheet_entries WHERE entry_date = CURRENT_DATE')
    const supervisors = await db.query("SELECT COUNT(*) FROM workers WHERE role = 'supervisor'")
    const housemasters = await db.query("SELECT COUNT(*) FROM workers WHERE role = 'housemaster'")
    return reply.send({
      total_workers: parseInt(workers.rows[0].count),
      active_workers: parseInt(active.rows[0].count),
      total_entries: parseInt(entries.rows[0].count),
      entries_today: parseInt(today.rows[0].count),
      total_supervisors: parseInt(supervisors.rows[0].count),
      total_housemasters: parseInt(housemasters.rows[0].count)
    })
  })

  fastify.post('/api/admin/invite', { onRequest: [isAdmin] }, async (request, reply) => {
    const { email, work_number, role } = request.body
    if (!role) return reply.status(400).send({ error: 'Role is required' })
    if (!email && !work_number) return reply.status(400).send({ error: 'Email or work number required' })

    const crypto = require('crypto')
    const token = crypto.randomBytes(32).toString('hex')

    await db.query(
      'INSERT INTO invitations (email, work_number, role, invited_by, token) VALUES ($1, $2, $3, $4, $5)',
      [email || null, work_number || null, role, request.user.id, token]
    )

    const frontendUrl = process.env.FRONTEND_URL || 'https://www.rannikon.com'
    const registerUrl = `${frontendUrl}/register?token=${token}&role=${role}${work_number ? '&work_number=' + work_number : ''}`

    const roleLabels = {
      worker: 'work at Rannikon Puutarha',
      supervisor: 'supervise at Rannikon Puutarha',
      housemaster: 'as a housemaster at Rannikon Puutarha',
      admin: 'as an administrator at Rannikon Puutarha'
    }

    if (email) {
      const { Resend } = require('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: email,
        subject: `You have been invited to ${roleLabels[role] || role}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <img src="https://www.rannikon.com/rannikkopuutarhalogo.png" alt="Rannikon Puutarha" style="height:48px;margin-bottom:24px"/>
            <h2 style="font-size:20px;font-weight:700;color:#1a1a18;margin-bottom:12px">
              You have been invited to ${roleLabels[role] || role}
            </h2>
            <p style="font-size:15px;color:#555;line-height:1.6;margin-bottom:8px">
              You have been invited to join the Rannikon Puutarha timesheet system.
            </p>
            ${work_number ? `<p style="font-size:15px;color:#555;margin-bottom:24px">Your work number is: <b>${work_number}</b></p>` : ''}
            <a href="${registerUrl}" style="display:inline-block;padding:12px 28px;background:#2d6a2d;color:#fff;font-size:15px;font-weight:700;border-radius:8px;text-decoration:none">
              Create your account
            </a>
            <p style="font-size:13px;color:#999;margin-top:24px">
              This link expires in 7 days. If you did not expect this, ignore this email.
            </p>
          </div>
        `
      })
    }

    return reply.send({ success: true, register_url: registerUrl })
  })

  fastify.get('/api/admin/invitations', { onRequest: [isAdmin] }, async (request, reply) => {
    const result = await db.query(
      `SELECT i.*, w.full_name as invited_by_name FROM invitations i
       LEFT JOIN workers w ON w.id = i.invited_by ORDER BY i.created_at DESC LIMIT 50`
    )
    return reply.send({ invitations: result.rows })
  })

  fastify.get('/api/admin/supervisor-logs/:date', { onRequest: [isAdmin] }, async (request, reply) => {
    const result = await db.query(
      `SELECT sl.*, w.full_name as supervisor_name, ss.total_break_mins as session_break, ss.session_date
       FROM supervisor_logs sl
       JOIN supervisor_sessions ss ON ss.id = sl.session_id
       JOIN workers w ON w.id = ss.supervisor_id
       WHERE ss.session_date = $1
       ORDER BY sl.house_group, sl.start_time, sl.worker_number`,
      [request.params.date]
    )

    const grouped = {}
    HOUSE_GROUPS.forEach(g => { grouped[g] = [] })
    result.rows.forEach(r => {
      const g = r.house_group || 'Unknown'
      if (!grouped[g]) grouped[g] = []
      grouped[g].push(r)
    })

    return reply.send({ logs: result.rows, grouped })
  })

  fastify.post('/api/admin/send-to-housemaster', { onRequest: [isAdmin] }, async (request, reply) => {
    const { house_group, date, logs } = request.body
    if (!house_group || !logs?.length) return reply.status(400).send({ error: 'house_group and logs required' })

    await db.query(
      'INSERT INTO housemaster_worklogs (house_group, session_date, sent_by, logs) VALUES ($1, $2, $3, $4)',
      [house_group, date || new Date().toISOString().split('T')[0], request.user.id, JSON.stringify(logs)]
    )

    const hmResult = await db.query(
      "SELECT email, full_name FROM workers WHERE role = 'housemaster' AND house_group = $1",
      [house_group]
    )

    if (!hmResult.rows[0]) {
      return reply.send({ success: true, warning: 'No housemaster found for this group — saved to app only' })
    }

    const hm = hmResult.rows[0]
    const dateLabel = new Date(date || new Date()).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

    const tableRows = logs.map(r =>
      `<tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:6px 10px;font-weight:700">${r.worker_number}</td>
        <td style="padding:6px 10px">${r.worker_name || ''}</td>
        <td style="padding:6px 10px">${r.start_time?.slice(0,5) || ''}</td>
        <td style="padding:6px 10px">${r.finish_time?.slice(0,5) || ''}</td>
        <td style="padding:6px 10px">${r.total_break_mins || 0} min</td>
        <td style="padding:6px 10px;font-weight:700;color:#2d6a2d">${r.total_hours || ''}</td>
        <td style="padding:6px 10px;color:#555">${r.what_work || ''}</td>
      </tr>`
    ).join('')

    const { Resend } = require('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: hm.email,
      subject: `Work log — ${house_group} — ${dateLabel}`,
      html: `
        <div style="font-family:sans-serif;max-width:700px;margin:0 auto;padding:24px">
          <img src="https://www.rannikon.com/rannikkopuutarhalogo.png" alt="Rannikon" style="height:40px;margin-bottom:16px"/>
          <h2 style="color:#2d6a2d;margin:0 0 4px">${house_group} — Work Log</h2>
          <p style="color:#555;margin:0 0 20px;font-size:14px">${dateLabel} &nbsp;|&nbsp; ${logs.length} workers</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#2d6a2d;color:#fff">
                <th style="padding:8px 10px;text-align:left">Work#</th>
                <th style="padding:8px 10px;text-align:left">Name</th>
                <th style="padding:8px 10px;text-align:left">Start</th>
                <th style="padding:8px 10px;text-align:left">Finish</th>
                <th style="padding:8px 10px;text-align:left">Break</th>
                <th style="padding:8px 10px;text-align:left">Total hrs</th>
                <th style="padding:8px 10px;text-align:left">Work done</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <p style="font-size:12px;color:#999;margin-top:20px">
            Log in to Rannikon to view and download this worklog:
            <a href="https://www.rannikon.com" style="color:#2d6a2d">www.rannikon.com</a>
          </p>
        </div>
      `
    })

    return reply.send({ success: true, sent_to: hm.email })
  })

  fastify.get('/api/admin/housemaster-worklogs', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const worker = await db.query('SELECT role, house_group FROM workers WHERE id = $1', [request.user.id])
    const w = worker.rows[0]
    if (!w || !['housemaster', 'admin'].includes(w.role)) {
      return reply.status(403).send({ error: 'Access denied' })
    }
    let result
    if (w.role === 'admin') {
      result = await db.query('SELECT * FROM housemaster_worklogs ORDER BY sent_at DESC LIMIT 50')
    } else {
      result = await db.query(
        'SELECT * FROM housemaster_worklogs WHERE house_group = $1 ORDER BY sent_at DESC LIMIT 50',
        [w.house_group]
      )
      await db.query('UPDATE housemaster_worklogs SET viewed = true WHERE house_group = $1', [w.house_group])
    }
    return reply.send({ worklogs: result.rows })
  })

}