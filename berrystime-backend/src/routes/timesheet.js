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

function calculate(actualStart, actualFinish) {
  const whiteStart = actualStart
  const whiteFinish = addMins(actualStart, 450)
  const orangeStart = addMins(actualStart, 480)
  const orangeFinish = actualFinish
  const orangeMins = Math.max(0, toMins(actualFinish) - toMins(orangeStart) - 15)
  const totalMins = 450 + orangeMins
  return {
    white_start: whiteStart,
    white_finish: whiteFinish,
    white_hours: '7:30',
    orange_start: orangeStart,
    orange_finish: orangeFinish,
    orange_hours: toHHMM(orangeMins),
    total_hours: toHHMM(totalMins)
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
    const { entry_date, actual_start, actual_finish, what_work } = request.body

    if (!entry_date || !actual_start || !actual_finish) {
      return reply.status(400).send({ error: 'Date, start time and finish time are required' })
    }

    const calc = calculate(actual_start, actual_finish)

    const result = await db.query(
      `INSERT INTO timesheet_entries
       (worker_id, entry_date, actual_start, actual_finish, what_work,
        white_start, white_finish, white_hours,
        orange_start, orange_finish, orange_hours, total_hours)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (worker_id, entry_date)
       DO UPDATE SET
         actual_start = $3,
         actual_finish = $4,
         what_work = $5,
         white_start = $6,
         white_finish = $7,
         white_hours = $8,
         orange_start = $9,
         orange_finish = $10,
         orange_hours = $11,
         total_hours = $12,
         updated_at = now()
       RETURNING *`,
      [
        request.user.id,
        entry_date,
        actual_start,
        actual_finish,
        what_work || '',
        calc.white_start,
        calc.white_finish,
        calc.white_hours,
        calc.orange_start,
        calc.orange_finish,
        calc.orange_hours,
        calc.total_hours
      ]
    )

    return reply.send({ entry: result.rows[0] })
  })

  fastify.delete('/api/timesheet/entry/:date', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const dateStr = request.params.date.split('T')[0]
    await db.query(
      'DELETE FROM timesheet_entries WHERE worker_id = $1 AND entry_date::date = $2::date',
      [request.user.id, dateStr]
    )
    return reply.send({ success: true })
  })

}