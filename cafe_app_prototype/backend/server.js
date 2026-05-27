const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config({ override: true })

const app = express()
const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || 'cafe_secret_key'

app.use(cors())
app.use(express.json())

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
})

pool.query(`
  CREATE TABLE IF NOT EXISTS cafes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) console.error('Error creating cafes table:', err)
  else pool.query(`ALTER TABLE cafes ADD COLUMN IF NOT EXISTS logo_url TEXT`, () => {
    console.log('Cafes table ready.')
  })
})

pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) console.error('Error creating users table:', err)
  else console.log('Users table ready.')
})

pool.query(`
  CREATE TABLE IF NOT EXISTS favorites (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    cafe_id INTEGER REFERENCES cafes(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, cafe_id)
  )
`, (err) => {
  if (err) console.error('Error creating favorites table:', err)
  else console.log('Favorites table ready.')
})

function requireAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

app.get('/', (req, res) => {
  res.send('Cafe app backend is running!')
})

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  try {
    const hash = await bcrypt.hash(password, 10)
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hash]
    )
    const user = result.rows[0]
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token, email: user.email })
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already in use' })
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    const user = result.rows[0]
    if (!user) return res.status(401).json({ error: 'Invalid email or password' })
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' })
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token, email: user.email })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})


app.get('/api/favorites', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT cafe_id FROM favorites WHERE user_id = $1',
      [req.user.userId]
    )
    res.json(result.rows.map(r => r.cafe_id))
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

app.post('/api/favorites/:cafeId', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO favorites (user_id, cafe_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.userId, req.params.cafeId]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

app.delete('/api/favorites/:cafeId', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM favorites WHERE user_id = $1 AND cafe_id = $2',
      [req.user.userId, req.params.cafeId]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

app.get('/api/users/locations', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT email, location_lat AS lat, location_lng AS lng FROM users WHERE show_location = TRUE AND location_lat IS NOT NULL'
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

app.get('/api/cafes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cafes')
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
