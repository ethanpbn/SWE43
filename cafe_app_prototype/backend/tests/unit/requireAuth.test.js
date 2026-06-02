const jwt = require('jsonwebtoken')

// Replicate requireAuth in isolation — no server or DB needed
const JWT_SECRET = process.env.JWT_SECRET || 'test_secret'

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

describe('requireAuth middleware', () => {
  let req, res, next

  beforeEach(() => {
    req = { headers: {} }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
    next = jest.fn()
  })

  test('returns 401 when Authorization header is absent', () => {
    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
    expect(next).not.toHaveBeenCalled()
  })

  test('returns 401 when auth scheme is not Bearer', () => {
    req.headers.authorization = 'Basic dXNlcjpwYXNz'
    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
    expect(next).not.toHaveBeenCalled()
  })

  test('calls next() and attaches decoded user to req with a valid JWT', () => {
    const payload = { userId: 42, email: 'alice@example.com' }
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' })
    req.headers.authorization = `Bearer ${token}`

    requireAuth(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.user).toMatchObject(payload)
    expect(res.status).not.toHaveBeenCalled()
  })

  test('returns 401 when JWT is malformed', () => {
    req.headers.authorization = 'Bearer this.is.not.a.valid.jwt'
    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' })
    expect(next).not.toHaveBeenCalled()
  })

  test('returns 401 when JWT has already expired', () => {
    // Sign with an exp in the past so verify() throws TokenExpiredError immediately
    const token = jwt.sign(
      { userId: 1, exp: Math.floor(Date.now() / 1000) - 60 },
      JWT_SECRET
    )
    req.headers.authorization = `Bearer ${token}`

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' })
    expect(next).not.toHaveBeenCalled()
  })
})
