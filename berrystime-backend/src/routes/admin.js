'use strict'

const db = require('../db/index')

module.exports = async function adminRoutes(fastify) {

  async function isAdmin(request, reply) {
    await request.jwtVerify()
    const result = await db.query('SELECT role FROM workers WHERE id = $1', [request.user.id])
    if (!result.rows[0] || result.rows[0].role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }
  }

  fastify.get('/api/admin/workers', {
    onRequest: [isAdmin]
  }, async (request, reply) => {
    const result = await db.query(
      `SELECT id, work_number, full_name, email, role, is_active, created_at
       FROM workers ORDER BY work_number ASC`
    )
    return reply.send({ workers: result.rows })
  })

  fastify.get('/api/admin/workers/:id/timesheet/:month/:year', {
    onRequest: [isAdmin]
  }, async (request, reply) => {
    const { id, month, year } = request.params
    const result = await db.query(
      `SELECT * FROM timesheet_entries
       WHERE worker_id = $1
       AND EXTRACT(MONTH FROM entry_date) = $2
       AND EXTRACT(YEAR FROM entry_date) = $3
       ORDER BY entry_date ASC`,
      [id, month, year]
    )
    return reply.send({ entries: result.rows })
  })

  fastify.patch('/api/admin/workers/:id', {
    onRequest: [isAdmin]
  }, async (request, reply) => {
    const { role, is_active } = request.body
    const updates = []
    const values = []
    let idx = 1
    if (role !== undefined) { updates.push(`role = $${idx++}`); values.push(role) }
    if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); values.push(is_active) }
    if (updates.length === 0) return reply.status(400).send({ error: 'Nothing to update' })
    values.push(request.params.id)
    await db.query(`UPDATE workers SET ${updates.join(', ')} WHERE id = $${idx}`, values)
    return reply.send({ success: true })
  })

  fastify.get('/api/admin/stats', {
    onRequest: [isAdmin]
  }, async (request, reply) => {
    const workers = await db.query('SELECT COUNT(*) FROM workers')
    const entries = await db.query('SELECT COUNT(*) FROM timesheet_entries')
    const today = await db.query(
      `SELECT COUNT(*) FROM timesheet_entries WHERE entry_date = CURRENT_DATE`
    )
    return reply.send({
      total_workers: parseInt(workers.rows[0].count),
      total_entries: parseInt(entries.rows[0].count),
      entries_today: parseInt(today.rows[0].count)
    })
  })

}
