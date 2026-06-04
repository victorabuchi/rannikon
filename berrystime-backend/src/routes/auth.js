'use strict'

const bcrypt = require('bcrypt')
const db = require('../db/index')

module.exports = async function authRoutes(fastify) {

  fastify.post('/api/auth/register', async (request, reply) => {
    const { work_number, full_name, email, password } = request.body

    if (!work_number || !full_name || !email || !password) {
      return reply.status(400).send({ error: 'All fields are required' })
    }

    const existingNumber = await db.query(
      'SELECT id FROM workers WHERE work_number = $1',
      [work_number]
    )
    if (existingNumber.rows[0]) {
      return reply.status(409).send({ error: 'Work number ' + work_number + ' is already registered' })
    }

    const existingEmail = await db.query(
      'SELECT id FROM workers WHERE email = $1',
      [email]
    )
    if (existingEmail.rows[0]) {
      return reply.status(409).send({ error: 'This email is already registered' })
    }

    const password_hash = await bcrypt.hash(password, 12)

    const result = await db.query(
      `INSERT INTO workers (work_number, full_name, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, work_number, full_name, email`,
      [work_number, full_name, email, password_hash]
    )

    const worker = result.rows[0]

    const token = fastify.jwt.sign(
      { id: worker.id, work_number: worker.work_number, full_name: worker.full_name },
      { expiresIn: '30d' }
    )

    return reply.status(201).send({ token, worker })
  })

  fastify.post('/api/auth/login', async (request, reply) => {
    const { work_number, password } = request.body

    if (!work_number || !password) {
      return reply.status(400).send({ error: 'Work number and password are required' })
    }

    const result = await db.query(
      'SELECT * FROM workers WHERE work_number = $1 AND is_active = true',
      [work_number]
    )
    if (!result.rows[0]) {
      return reply.status(401).send({ error: 'Invalid work number or password' })
    }

    const worker = result.rows[0]

    const valid = await bcrypt.compare(password, worker.password_hash)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid work number or password' })
    }

    const token = fastify.jwt.sign(
      { id: worker.id, work_number: worker.work_number, full_name: worker.full_name },
      { expiresIn: '30d' }
    )

    return reply.send({
      token,
      worker: {
        id: worker.id,
        work_number: worker.work_number,
        full_name: worker.full_name,
        email: worker.email
      }
    })
  })

  fastify.get('/api/auth/me', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const result = await db.query(
      'SELECT id, work_number, full_name, email, created_at FROM workers WHERE id = $1',
      [request.user.id]
    )
    if (!result.rows[0]) {
      return reply.status(404).send({ error: 'Worker not found' })
    }
    return reply.send({ worker: result.rows[0] })
  })

}