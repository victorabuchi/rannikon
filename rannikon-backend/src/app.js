'use strict'

require('dotenv').config()

const fastify = require('fastify')({ logger: true })

fastify.register(require('@fastify/cors'), {
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:4004',
      'https://berrystime.onrender.com', 'https://rannikon-frontend.onrender.com',
      'https://rannikon.com',
      'https://www.rannikon.com'
    ]
    if (!origin || allowed.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'), false)
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true
})

fastify.register(require('@fastify/jwt'), {
  secret: process.env.JWT_SECRET || 'rannikon_dev_secret'
})

fastify.register(require('@fastify/oauth2'), {
  name: 'googleOAuth2',
  scope: ['profile', 'email'],
  credentials: {
    client: {
      id: process.env.GOOGLE_CLIENT_ID,
      secret: process.env.GOOGLE_CLIENT_SECRET
    },
    auth: require('@fastify/oauth2').GOOGLE_CONFIGURATION
  },
  startRedirectPath: '/api/auth/google',
  callbackUri: process.env.NODE_ENV === 'production'
    ? 'https://api.rannikon.com/api/auth/google/callback'
    : 'http://localhost:4003/api/auth/google/callback'
})

fastify.decorate('authenticate', async function (request, reply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized' })
  }
})

fastify.register(require('./routes/auth'))
fastify.register(require('./routes/timesheet'))
fastify.register(require('./routes/admin'))
fastify.register(require('./routes/supervisor'))
fastify.register(require('./routes/green'))


fastify.get('/health', async (request, reply) => {
  return {
    status: 'Berrystime backend is running',
    port: process.env.PORT || 4003,
    time: new Date().toISOString()
  }
})

const start = async () => {
  try {
    await fastify.listen({
      port: process.env.PORT || 4003,
      host: '0.0.0.0'
    })
    console.log('Berrystime backend running on http://localhost:4003')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()