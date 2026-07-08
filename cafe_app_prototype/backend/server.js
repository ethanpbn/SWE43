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
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
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


app.put('/api/users/location', requireAuth, async (req, res) => {
  const { lat, lng } = req.body
  try {
    await pool.query(
      'UPDATE users SET location_lat = $1, location_lng = $2, show_location = TRUE WHERE id = $3',
      [lat, lng, req.user.userId]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

app.delete('/api/users/location', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET location_lat = NULL, location_lng = NULL, show_location = FALSE WHERE id = $1',
      [req.user.userId]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

app.get('/api/users/locations', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.email, u.location_lat AS lat, u.location_lng AS lng
       FROM users u
       WHERE u.show_location = TRUE
         AND u.location_lat IS NOT NULL
         AND u.id != $1
         AND u.id IN (
           SELECT CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
           FROM friendships f
           WHERE (f.requester_id = $1 OR f.addressee_id = $1) AND f.status = 'accepted'
         )
         AND u.id NOT IN (
           SELECT blocked_id FROM blocks WHERE blocker_id = $1
           UNION
           SELECT blocker_id FROM blocks WHERE blocked_id = $1
         )`,
      [req.user.userId]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

app.post('/api/blocks/:targetEmail', requireAuth, async (req, res) => {
  try {
    const target = await pool.query('SELECT id FROM users WHERE email = $1', [req.params.targetEmail])
    if (!target.rows[0]) return res.status(404).json({ error: 'User not found' })
    await pool.query(
      'INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.userId, target.rows[0].id]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

app.delete('/api/blocks/:targetEmail', requireAuth, async (req, res) => {
  try {
    const target = await pool.query('SELECT id FROM users WHERE email = $1', [req.params.targetEmail])
    if (!target.rows[0]) return res.status(404).json({ error: 'User not found' })
    await pool.query(
      'DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [req.user.userId, target.rows[0].id]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Database error' })
  }
})

app.get('/api/friends', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email FROM friendships f
      JOIN users u ON (CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END = u.id)
      WHERE (f.requester_id = $1 OR f.addressee_id = $1) AND f.status = 'accepted'
    `, [req.user.userId])
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: 'Database error' }) }
})

app.get('/api/friends/requests', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email FROM friendships f
      JOIN users u ON f.requester_id = u.id
      WHERE f.addressee_id = $1 AND f.status = 'pending'
    `, [req.user.userId])
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: 'Database error' }) }
})

app.post('/api/friends/request', requireAuth, async (req, res) => {
  const { email } = req.body
  try {
    const target = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (!target.rows[0]) return res.status(404).json({ error: 'User not found' })
    const targetId = target.rows[0].id
    if (targetId === req.user.userId) return res.status(400).json({ error: 'Cannot add yourself' })
    await pool.query(
      'INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.userId, targetId]
    )
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: 'Database error' }) }
})

app.put('/api/friends/accept/:requesterId', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE friendships SET status = $1 WHERE requester_id = $2 AND addressee_id = $3',
      ['accepted', req.params.requesterId, req.user.userId]
    )
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: 'Database error' }) }
})

app.delete('/api/friends/:friendId', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM friendships WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)',
      [req.user.userId, req.params.friendId]
    )
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: 'Database error' }) }
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

async function initializeDatabase() {
  try {
    // Users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS show_location BOOLEAN DEFAULT FALSE
    `)

    console.log("Users table ready.")

    // Cafes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cafes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        description TEXT,
        logo_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    console.log("Cafes table ready.")

    // Favorites
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        cafe_id INTEGER REFERENCES cafes(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, cafe_id)
      )
    `)

    console.log("Favorites table ready.")

    // Friendships
    await pool.query(`
      CREATE TABLE IF NOT EXISTS friendships (
        id SERIAL PRIMARY KEY,
        requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        addressee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(requester_id, addressee_id)
      )
    `)

    console.log("Friendships table ready.")

    // Blocks
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blocks (
        blocker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        blocked_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (blocker_id, blocked_id)
      )
    `)

    console.log("Blocks table ready.")

    console.log("Database initialized.")
  } catch (err) {
    console.error("Database initialization failed:", err)
    throw err
  }
}

async function startServer() {
  try {
    await initializeDatabase()

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  } catch (err) {
    process.exit(1)
  }
}

if (require.main === module) {
  startServer()
}

module.exports = app

