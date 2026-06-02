jest.mock('pg')
jest.mock('dotenv', () => ({ config: jest.fn() }))

const request = require('supertest')
const { mockQuery } = require('pg')

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

  test('returns 500 when the database query fails', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB timeout'))

    const res = await request(app).get('/api/cafes')

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Database error')
  })

  test('each cafe in the response includes id, name, location, and description fields', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 3, name: 'Kean Coffee', location: 'Newport Beach, CA', description: 'Specialty roaster', logo_url: null }],
    })

    const res = await request(app).get('/api/cafes')

    expect(res.status).toBe(200)
    const cafe = res.body[0]
    expect(cafe).toHaveProperty('id')
    expect(cafe).toHaveProperty('name')
    expect(cafe).toHaveProperty('location')
    expect(cafe).toHaveProperty('description')
  })

  test('is a public endpoint — no auth token required', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Any Cafe' }] })

    const res = await request(app).get('/api/cafes')

    expect(res.status).toBe(200)
  })

  test('preserves long cafe names without truncation', async () => {
    const longName = 'The Extraordinarily Long Named Café That Goes On And On Without End'
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 5, name: longName }] })

    const res = await request(app).get('/api/cafes')

    expect(res.body[0].name).toBe(longName)
  })
})
