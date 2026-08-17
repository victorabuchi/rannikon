'use strict'

const db = require('../db/index')

module.exports = async function boardRoutes(fastify) {

  // Every supervisor-recorded batch for a given date, across every supervisor and
  // house group — the data behind the TV-display board. Read-only, open to any
  // logged-in worker, same access model as /api/archive/worklogs.
  fastify.get('/api/board/batches/:date', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const result = await db.query(
      `SELECT b.id, b.worker_numbers, b.start_time, b.finish_time, b.total_break_mins
       FROM supervisor_batches b
       JOIN supervisor_sessions s ON s.id = b.session_id
       WHERE s.session_date = $1
       ORDER BY b.start_time ASC`,
      [request.params.date]
    )
    return reply.send({ batches: result.rows })
  })

}
