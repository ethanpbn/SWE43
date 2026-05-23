const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config()

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) console.error('Error creating cafes table:', err)
  else console.log('Cafes table ready.')
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
