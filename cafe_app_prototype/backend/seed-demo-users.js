require('dotenv').config()
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
})

// Pre-set coordinates near Irvine, CA so users appear on the map immediately
const DEMO_USERS = [
  { email: 'alice@demo.com',  password: 'demo1234', lat: 33.6923, lng: -117.8302 },
  { email: 'bob@demo.com',    password: 'demo1234', lat: 33.6801, lng: -117.8415 },
  { email: 'carol@demo.com',  password: 'demo1234', lat: 33.6745, lng: -117.8198 },
]

async function seed() {
  for (const u of DEMO_USERS) {
    const hash = await bcrypt.hash(u.password, 10)
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, location_lat, location_lng, show_location)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (email) DO NOTHING
       RETURNING email`,
      [u.email, hash, u.lat, u.lng]
    )
    if (result.rows.length > 0) {
      console.log(`  Created: ${u.email}`)
    } else {
      console.log(`  Exists:  ${u.email}`)
    }
  }
  await pool.end()
}

seed().catch(err => { console.error(err); process.exit(1) })
