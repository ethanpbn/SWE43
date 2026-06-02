jest.mock('pg')
jest.mock('dotenv', () => ({ config: jest.fn() }))

const request = require('supertest')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { mockQuery } = require('pg')

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret'

let app

beforeAll(() => {
  app = require('../../server')
})

beforeEach(() => {
  mockQuery.mockReset()
  // Default: callback-style calls succeed (handles startup CREATE TABLE queries)
  mockQuery.mockImplementation((sql, paramsOrCb, cb) => {
    const callback =
      typeof paramsOrCb === 'function' ? paramsOrCb :
      typeof cb === 'function' ? cb : null
    if (callback) {
      callback(null, { rows: [], rowCount: 0 })
      return
    }
    return Promise.resolve({ rows: [], rowCount: 0 })
  })
})

describe('POST /api/auth/register', () => {
  test('registers a new user and returns a signed JWT', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, email: 'newuser@example.com' }] })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'newuser@example.com', password: 'securePass1' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body.email).toBe('newuser@example.com')

    const decoded = jwt.verify(res.body.token, JWT_SECRET)
    expect(decoded.userId).toBe(1)
  })

  test('returns 400 when email is missing from the request body', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'securePass1' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Email and password required')
  })

  test('returns 400 when email is already registered (unique constraint)', async () => {
    mockQuery.mockRejectedValueOnce({ code: '23505' })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'existing@example.com', password: 'securePass1' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Email already in use')
  })
})

describe('POST /api/auth/login', () => {
  test('returns a signed JWT when credentials are correct', async () => {
    const hash = await bcrypt.hash('correctPassword', 10)
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 2, email: 'user@example.com', password_hash: hash }],
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'correctPassword' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body.email).toBe('user@example.com')
  })

  test('returns 401 when the password is wrong', async () => {
    const hash = await bcrypt.hash('realPassword', 10)
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 2, email: 'user@example.com', password_hash: hash }],
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'wrongPassword' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Invalid email or password')
  })

  test('returns 401 when no account exists for that email', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: 'anything' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Invalid email or password')
  })

  test('returns 400 when password is missing from the request body', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Email and password required')
  })
})
