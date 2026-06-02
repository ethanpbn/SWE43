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

describe('GET /api/cafes', () => {
  test('returns all cafes from the database', async () => {
    const fakeCafes = [
      { id: 1, name: 'Bean There', location: 'Main St', description: 'Cozy spot' },
      { id: 2, name: 'Brew Co', location: 'Oak Ave', description: 'Great wifi' },
    ]
    mockQuery.mockResolvedValueOnce({ rows: fakeCafes })

    const res = await request(app).get('/api/cafes')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].name).toBe('Bean There')
    expect(res.body[1].name).toBe('Brew Co')
  })

  test('returns an empty array when no cafes exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const res = await request(app).get('/api/cafes')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('POST /api/blocks/:targetEmail', () => {
  test('blocks another user by email and returns ok', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // SELECT target user
      .mockResolvedValueOnce({ rows: [] })            // INSERT block

    const res = await request(app)
      .post('/api/blocks/target@example.com')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  test('returns 404 when the target user does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .post('/api/blocks/nobody@example.com')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('User not found')
  })

  test('returns 401 when blocking without authentication', async () => {
    const res = await request(app).post('/api/blocks/target@example.com')

    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/blocks/:targetEmail', () => {
  test('unblocks a user and returns ok', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // SELECT target user
      .mockResolvedValueOnce({ rows: [] })            // DELETE block

    const res = await request(app)
      .delete('/api/blocks/target@example.com')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})
