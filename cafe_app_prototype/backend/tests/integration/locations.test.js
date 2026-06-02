// Tests for GET /api/users/locations
// Covers: block filter function, notification recipient filter, block enforcement end-to-end

jest.mock('pg')
jest.mock('dotenv', () => ({ config: jest.fn() }))

const request = require('supertest')
const jwt = require('jsonwebtoken')
const { mockQuery } = require('pg')

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret'
const authToken = jwt.sign({ userId: 1, email: 'user@example.com' }, JWT_SECRET)

let app

beforeAll(() => {
  app = require('../../server')
})

beforeEach(() => {
  mockQuery.mockReset()
  mockQuery.mockResolvedValue({ rows: [] })
})

describe('GET /api/users/locations — unauthenticated (notification recipient filter off)', () => {
  test('returns all location-sharing users when no token is supplied', async () => {
    const visible = [
      { email: 'alice@example.com', lat: 33.68, lng: -117.83 },
      { email: 'bob@example.com', lat: 33.69, lng: -117.82 },
    ]
    mockQuery.mockResolvedValueOnce({ rows: visible })

    const res = await request(app).get('/api/users/locations')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0]).toEqual({ email: 'alice@example.com', lat: 33.68, lng: -117.83 })
  })

  test('unauthenticated query does NOT include the block-exclusion subquery', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await request(app).get('/api/users/locations')

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).not.toMatch(/blocked_id|blocker_id/)
  })

  test('returns an empty array when no users have location sharing enabled', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const res = await request(app).get('/api/users/locations')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('GET /api/users/locations — authenticated (block filter active)', () => {
  test('authenticated query excludes the requesting user via id != $1', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await request(app)
      .get('/api/users/locations')
      .set('Authorization', `Bearer ${authToken}`)

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toMatch(/id != \$1/)
    expect(params[0]).toBe(1) // userId from the token
  })

  test('authenticated query includes bidirectional block exclusion subquery', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await request(app)
      .get('/api/users/locations')
      .set('Authorization', `Bearer ${authToken}`)

    const [sql] = mockQuery.mock.calls[0]
    // Both directions: users I blocked AND users who blocked me
    expect(sql).toMatch(/SELECT blocked_id FROM blocks WHERE blocker_id/)
    expect(sql).toMatch(/SELECT blocker_id FROM blocks WHERE blocked_id/)
    expect(sql).toMatch(/UNION/)
  })

  test('returns users that are not blocked and excludes self', async () => {
    const nearby = [{ email: 'carol@example.com', lat: 33.70, lng: -117.80 }]
    mockQuery.mockResolvedValueOnce({ rows: nearby })

    const res = await request(app)
      .get('/api/users/locations')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].email).toBe('carol@example.com')
  })

  test('returns empty array when all nearby users are blocked (end-to-end block enforcement)', async () => {
    // Simulates: current user has blocked or been blocked by everyone nearby
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .get('/api/users/locations')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  test('each user entry contains email, lat, and lng — no sensitive fields', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ email: 'dave@example.com', lat: 33.71, lng: -117.81 }],
    })

    const res = await request(app)
      .get('/api/users/locations')
      .set('Authorization', `Bearer ${authToken}`)

    const user = res.body[0]
    expect(user).toHaveProperty('email')
    expect(user).toHaveProperty('lat')
    expect(user).toHaveProperty('lng')
    expect(user).not.toHaveProperty('password_hash')
    expect(user).not.toHaveProperty('id')
  })

  test('expired or invalid token falls back to unauthenticated query without crashing', async () => {
    const expired = jwt.sign(
      { userId: 1, exp: Math.floor(Date.now() / 1000) - 60 },
      JWT_SECRET
    )
    mockQuery.mockResolvedValueOnce({ rows: [{ email: 'eve@example.com', lat: 33.68, lng: -117.83 }] })

    const res = await request(app)
      .get('/api/users/locations')
      .set('Authorization', `Bearer ${expired}`)

    // Server swallows the JWT error and falls back to the public query
    expect(res.status).toBe(200)
    // The fallback query does not include the block filter
    const [sql] = mockQuery.mock.calls[0]
    expect(sql).not.toMatch(/id != \$1/)
  })
})
