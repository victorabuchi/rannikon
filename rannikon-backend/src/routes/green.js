'use strict'

const db = require('../db/index')

module.exports = async function greenRoutes(fastify) {

  fastify.get('/api/green/:month/:year', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { month, year } = request.params
    const result = await db.query(
      `SELECT * FROM green_paper_entries
       WHERE worker_id = $1
       AND EXTRACT(MONTH FROM entry_date) = $2
       AND EXTRACT(YEAR FROM entry_date) = $3
       ORDER BY entry_date ASC`,
      [request.user.id, month, year]
    )
    return reply.send({ entries: result.rows })
  })

  fastify.post('/api/green/entry', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { entry_date, start_time, finish_time, kg_picked, what_picked } = request.body
    if (!entry_date) return reply.status(400).send({ error: 'entry_date is required' })

    const result = await db.query(
      `INSERT INTO green_paper_entries
       (worker_id, entry_date, start_time, finish_time, kg_picked, what_picked)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (worker_id, entry_date)
       DO UPDATE SET
         start_time = $3, finish_time = $4, kg_picked = $5, what_picked = $6,
         updated_at = now()
       RETURNING *`,
      [request.user.id, entry_date, start_time || null, finish_time || null,
       kg_picked || null, what_picked || '']
    )
    return reply.send({ entry: result.rows[0] })
  })

  fastify.patch('/api/green/entry/:date/field', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { field, value } = request.body
    const dateStr = request.params.date.split('T')[0]
    const allowed = ['start_time', 'finish_time', 'kg_picked', 'what_picked']
    if (!allowed.includes(field)) return reply.status(400).send({ error: 'Field not allowed' })
    await db.query(
      `UPDATE green_paper_entries SET ${field} = $1, updated_at = now()
       WHERE worker_id = $2 AND entry_date::date = $3::date`,
      [value, request.user.id, dateStr]
    )
    return reply.send({ success: true })
  })

  fastify.delete('/api/green/entry/:date', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const dateStr = request.params.date.split('T')[0]
    await db.query(
      'DELETE FROM green_paper_entries WHERE worker_id = $1 AND entry_date::date = $2::date',
      [request.user.id, dateStr]
    )
    return reply.send({ success: true })
  })

}