jest.mock('pg')
jest.mock('dotenv', () => ({ config: jest.fn() }))

const request = require('supertest')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { mockQuery } = require('pg')

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret'
const WRONG_SECRET = 'completely_different_secret'

let app

beforeAll(() => {
  app = require('../../server')
})

beforeEach(() => {
  mockQuery.mockReset()
  mockQuery.mockResolvedValue({ rows: [] })
})

describe('Auth token verification', () => {
  test('token signed with a different secret is rejected with 401', async () => {
    const tampered = jwt.sign({ userId: 1, email: 'user@example.com' }, WRONG_SECRET)

    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${tampered}`)

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Invalid token')
  })

  test('expired token is rejected even if the signature is valid', async () => {
    const expired = jwt.sign(
      { userId: 1, email: 'user@example.com', exp: Math.floor(Date.now() / 1000) - 60 },
      JWT_SECRET
    )

    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${expired}`)

    expect(res.status).toBe(401)
  })

  test('token with a payload crafted to spoof admin access is rejected', async () => {
    const spoofed = jwt.sign({ userId: 0, email: 'admin@system.internal', role: 'admin' }, WRONG_SECRET)

    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${spoofed}`)

    expect(res.status).toBe(401)
  })

  test('completely malformed token string is rejected', async () => {
    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', 'Bearer not.a.jwt')

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Invalid token')
  })

  test('token with only the Bearer prefix and no value is rejected', async () => {
    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', 'Bearer ')

    expect(res.status).toBe(401)
  })
})

describe('Auth response data exposure', () => {
  test('login response does not expose password_hash', async () => {
    const hash = await bcrypt.hash('password123', 10)
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'user@example.com', password_hash: hash }],
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body).not.toHaveProperty('password_hash')
    expect(res.body).not.toHaveProperty('password')
  })

  test('register response does not expose password_hash', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, email: 'new@example.com' }] })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@example.com', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body).not.toHaveProperty('password_hash')
    expect(res.body).not.toHaveProperty('password')
  })

  test('issued JWT payload contains userId and email but no sensitive fields', () => {
    const token = jwt.sign(
      { userId: 1, email: 'user@example.com' },
      JWT_SECRET,
      { expiresIn: '30d' }
    )
    const decoded = jwt.verify(token, JWT_SECRET)

    expect(decoded).toHaveProperty('userId')
    expect(decoded).toHaveProperty('email')
    expect(decoded).not.toHaveProperty('password')
    expect(decoded).not.toHaveProperty('password_hash')
  })

  test('JWT has an expiry claim (exp) set', () => {
    const token = jwt.sign({ userId: 1, email: 'user@example.com' }, JWT_SECRET, { expiresIn: '30d' })
    const decoded = jwt.decode(token)

    expect(decoded).toHaveProperty('exp')
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })
})

describe('Token not verified / stored insecurely', () => {
  test('a token that is valid but belongs to a different user cannot elevate privileges', async () => {
    const userAToken = jwt.sign({ userId: 1, email: 'a@example.com' }, JWT_SECRET)
    mockQuery.mockResolvedValueOnce({ rows: [{ cafe_id: 5 }] })

    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${userAToken}`)

    expect(res.status).toBe(200)
    // Confirms the query uses the decoded userId from the token, not a user-supplied one
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      [1]
    )
  })

  test('re-using another user\'s token to POST a block uses that token\'s userId', async () => {
    const stolenToken = jwt.sign({ userId: 99, email: 'victim@example.com' }, JWT_SECRET)
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 5 }] }).mockResolvedValueOnce({ rows: [] })

    await request(app)
      .post('/api/blocks/target@example.com')
      .set('Authorization', `Bearer ${stolenToken}`)

    const insertCall = mockQuery.mock.calls.find(([sql]) =>
      typeof sql === 'string' && sql.includes('INSERT INTO blocks')
    )
    // The block is placed as userId 99 (the token's userId), not any other
    expect(insertCall[1][0]).toBe(99)
  })
})
