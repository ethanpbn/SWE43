jest.mock('pg')
jest.mock('dotenv', () => ({ config: jest.fn() }))

const request = require('supertest')
const jwt = require('jsonwebtoken')
const { mockQuery } = require('pg')

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret'
const tokenA = jwt.sign({ userId: 1, email: 'user-a@example.com' }, JWT_SECRET)
const tokenB = jwt.sign({ userId: 2, email: 'user-b@example.com' }, JWT_SECRET)

let app

beforeAll(() => {
  app = require('../../server')
})

beforeEach(() => {
  mockQuery.mockReset()
  mockQuery.mockResolvedValue({ rows: [] })
})

describe('Concurrent block requests', () => {
  test('two simultaneous block requests from the same user both resolve without error', async () => {
    // Both requests hit ON CONFLICT DO NOTHING — neither should 500
    mockQuery.mockResolvedValue({ rows: [{ id: 3 }] })

    const [res1, res2] = await Promise.all([
      request(app).post('/api/blocks/target@example.com').set('Authorization', `Bearer ${tokenA}`),
      request(app).post('/api/blocks/target@example.com').set('Authorization', `Bearer ${tokenA}`),
    ])

    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
    expect(res1.body.ok).toBe(true)
    expect(res2.body.ok).toBe(true)
  })

  test('two different users blocking the same target both succeed independently', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 3 }] })

    const [res1, res2] = await Promise.all([
      request(app).post('/api/blocks/target@example.com').set('Authorization', `Bearer ${tokenA}`),
      request(app).post('/api/blocks/target@example.com').set('Authorization', `Bearer ${tokenB}`),
    ])

    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
  })

  test('INSERT query includes ON CONFLICT DO NOTHING to prevent duplicate rows', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 3 }] }).mockResolvedValueOnce({ rows: [] })

    await request(app)
      .post('/api/blocks/target@example.com')
      .set('Authorization', `Bearer ${tokenA}`)

    const insertCall = mockQuery.mock.calls.find(([sql]) =>
      typeof sql === 'string' && sql.includes('INSERT INTO blocks')
    )
    expect(insertCall).toBeDefined()
    expect(insertCall[0]).toMatch(/ON CONFLICT DO NOTHING/i)
  })

  test('blocking a non-existent user returns 404, not a server error', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }) // target not found

    const res = await request(app)
      .post('/api/blocks/ghost@example.com')
      .set('Authorization', `Bearer ${tokenA}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('User not found')
  })
})

describe('Unauthorized access via API manipulation', () => {
  test('favorites endpoint always scopes to the token owner, not a URL parameter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ cafe_id: 7 }] })

    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${tokenA}`) // userId = 1

    expect(res.status).toBe(200)
    // The SQL must use the token's userId, not anything from the URL
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      [1]
    )
  })

  test('user cannot read another user\'s favorites by supplying a different token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ cafe_id: 99 }] })

    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${tokenB}`) // userId = 2

    expect(res.status).toBe(200)
    // Must query for userId 2 (tokenB), not userId 1
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      [2]
    )
  })

  test('adding a favorite uses token userId, preventing cross-user writes', async () => {
    await request(app)
      .post('/api/favorites/42')
      .set('Authorization', `Bearer ${tokenA}`)

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO favorites'),
      [1, '42'] // userId from tokenA, not a caller-controlled value
    )
  })

  test('deleting a favorite uses token userId, preventing cross-user deletes', async () => {
    await request(app)
      .delete('/api/favorites/42')
      .set('Authorization', `Bearer ${tokenA}`)

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM favorites WHERE user_id = $1'),
      [1, '42']
    )
  })

  test('sending a valid token for user A cannot unblock on behalf of user B', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 3 }] }).mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .delete('/api/blocks/target@example.com')
      .set('Authorization', `Bearer ${tokenA}`)

    expect(res.status).toBe(200)
    // Verify the DELETE used tokenA's userId (1), not tokenB's (2)
    const deleteCall = mockQuery.mock.calls.find(([sql]) =>
      typeof sql === 'string' && sql.includes('DELETE FROM blocks')
    )
    expect(deleteCall[1][0]).toBe(1)
  })
})
