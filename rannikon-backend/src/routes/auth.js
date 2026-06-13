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
      'SELECT * FROM workers WHERE (work_number = $1 OR email = $1) AND is_active = true',
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
        email: worker.email,
        role: worker.role
      }
    })
  })

  fastify.get('/api/auth/me', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const result = await db.query(
      'SELECT id, work_number, full_name, email, role, created_at FROM workers WHERE id = $1',
      [request.user.id]
    )
    if (!result.rows[0]) {
      return reply.status(404).send({ error: 'Worker not found' })
    }
    return reply.send({ worker: result.rows[0] })
  })

  fastify.patch('/api/auth/work-number', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { work_number } = request.body
    if (!work_number || !work_number.trim()) {
      return reply.status(400).send({ error: 'Work number is required' })
    }
    const clean = work_number.trim()
    const existing = await db.query(
      'SELECT id FROM workers WHERE work_number = $1 AND id != $2',
      [clean, request.user.id]
    )
    if (existing.rows[0]) {
      return reply.status(409).send({ error: 'Work number ' + clean + ' is already taken' })
    }
    await db.query('UPDATE workers SET work_number = $1 WHERE id = $2', [clean, request.user.id])
    const result = await db.query(
      'SELECT id, work_number, full_name, email, role FROM workers WHERE id = $1',
      [request.user.id]
    )
    const updated = result.rows[0]
    const token = fastify.jwt.sign(
      { id: updated.id, work_number: updated.work_number, full_name: updated.full_name },
      { expiresIn: '30d' }
    )
    return reply.send({ token, worker: updated })
  })

  fastify.post('/api/auth/forgot-password', async (request, reply) => {
    const { email } = request.body
    if (!email) return reply.status(400).send({ error: 'Email is required' })

    const result = await db.query(
      'SELECT id, full_name, email FROM workers WHERE email = $1',
      [email]
    )

    if (!result.rows[0]) {
      return reply.send({ message: 'If this email exists a reset link has been sent' })
    }

    const worker = result.rows[0]
    const token = fastify.jwt.sign({ id: worker.id, type: 'reset' }, { expiresIn: '1h' })
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`

    const { Resend } = require('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: worker.email,
      subject: 'Reset your Rannikon password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <img src="https://www.rannikon.com/rannikkopuutarhalogo.png" alt="Rannikon Puutarha" style="height:48px;margin-bottom:24px" />
          <h2 style="font-size:22px;font-weight:700;color:#1a1a18;margin-bottom:12px">Reset your password</h2>
          <p style="font-size:15px;color:#555;line-height:1.6;margin-bottom:24px">Hi ${worker.full_name}, click the button below to reset your Rannikon password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;background:#2d6a2d;color:#fff;font-size:15px;font-weight:700;border-radius:8px;text-decoration:none">Reset password</a>
          <p style="font-size:13px;color:#999;margin-top:24px">If you did not request this, ignore this email. Your password will not change.</p>
        </div>
      `
    })

    return reply.send({ message: 'If this email exists a reset link has been sent' })
  })

  fastify.post('/api/auth/reset-password', async (request, reply) => {
    const { token, password } = request.body
    if (!token || !password) return reply.status(400).send({ error: 'Token and password are required' })

    let payload
    try {
      payload = fastify.jwt.verify(token)
    } catch (err) {
      return reply.status(400).send({ error: 'Reset link is invalid or has expired' })
    }

    if (payload.type !== 'reset') {
      return reply.status(400).send({ error: 'Invalid reset token' })
    }

    const password_hash = await bcrypt.hash(password, 12)

    await db.query(
      'UPDATE workers SET password_hash = $1 WHERE id = $2',
      [password_hash, payload.id]
    )

    return reply.send({ message: 'Password reset successfully' })
  })

  fastify.get('/api/auth/google/callback', async (request, reply) => {
    try {
      const token = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request)
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: 'Bearer ' + token.token.access_token }
      })
      const profile = await res.json()

      let worker = await db.query('SELECT * FROM workers WHERE google_id = $1', [profile.id])

      if (!worker.rows[0]) {
        worker = await db.query('SELECT * FROM workers WHERE email = $1', [profile.email])
        if (worker.rows[0]) {
          await db.query('UPDATE workers SET google_id = $1 WHERE email = $2', [profile.id, profile.email])
        } else {
          const result = await db.query(
            `INSERT INTO workers (work_number, full_name, email, google_id, is_active)
             VALUES ($1, $2, $3, $4, true) RETURNING *`,
            ['G-' + profile.id.slice(-6), profile.name, profile.email, profile.id]
          )
          worker = result
        }
      }

      const w = worker.rows[0]
      const jwtToken = fastify.jwt.sign(
        { id: w.id, work_number: w.work_number, full_name: w.full_name },
        { expiresIn: '30d' }
      )

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4004'
      return reply.redirect(`${frontendUrl}/auth/callback?token=${jwtToken}&worker=${encodeURIComponent(JSON.stringify({ id: w.id, work_number: w.work_number, full_name: w.full_name, email: w.email }))}`)
    } catch (err) {
      fastify.log.error(err)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4004'
      return reply.redirect(`${frontendUrl}/login?error=google_auth_failed`)
    }
  })

}