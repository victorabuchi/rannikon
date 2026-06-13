'use strict'

const { Pool, types } = require('pg')

// Return DATE columns as plain strings (YYYY-MM-DD) instead of JavaScript
// Date objects — pg's default Date parsing applies the local timezone offset
// which shifts the date when the server is not UTC.
types.setTypeParser(1082, val => val)

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
}