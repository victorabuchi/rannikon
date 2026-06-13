'use strict'

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const db = require('./index')

async function migrate() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
    await db.query(sql)
    console.log('All tables created successfully')
    process.exit(0)
  } catch (err) {
    console.error('Migration failed:', err.message)
    process.exit(1)
  }
}

migrate()