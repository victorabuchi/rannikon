'use strict'

const db = require('../db/index')

module.exports = async function archiveRoutes(fastify) {

  // Every housemaster worklog, every house group, exactly as the admin sent them —
  // read-only view any logged-in worker can open, unlike /api/admin/housemaster-worklogs
  // which is scoped to housemaster/admin roles and filtered to one house group.
  fastify.get('/api/archive/worklogs', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const result = await db.query(
      'SELECT * FROM housemaster_worklogs ORDER BY sent_at DESC LIMIT 500'
    )
    return reply.send({ worklogs: result.rows })
  })

}
