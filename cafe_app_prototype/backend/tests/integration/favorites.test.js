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

describe('GET /api/favorites', () => {
  test('returns the list of favorited cafe IDs for an authenticated user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ cafe_id: 3 }, { cafe_id: 7 }] })

    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toEqual([3, 7])
  })

  test('returns 401 when no auth token is provided', async () => {
    const res = await request(app).get('/api/favorites')

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Unauthorized')
  })
})

describe('POST /api/favorites/:cafeId', () => {
  test('adds a cafe to favorites and returns ok', async () => {
    const res = await request(app)
      .post('/api/favorites/5')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO favorites'),
      [1, '5']
    )
  })

  test('returns 401 when adding a favorite without auth', async () => {
    const res = await request(app).post('/api/favorites/5')

    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/favorites/:cafeId', () => {
  test('removes a cafe from favorites and returns ok', async () => {
    const res = await request(app)
      .delete('/api/favorites/5')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM favorites'),
      [1, '5']
    )
  })

  test('returns 401 when removing a favorite without auth', async () => {
    const res = await request(app).delete('/api/favorites/5')

    expect(res.status).toBe(401)
  })
})
