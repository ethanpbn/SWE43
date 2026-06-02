// Unit tests for check-in expiry logic extracted from context/location.tsx and app/_layout.tsx.
// Pure functions are replicated here so the tests run in Node without React Native.

const CHECKIN_DURATION_MS = 2 * 60 * 60 * 1000 // must match location.tsx

// --- Logic replicated from LocationProvider startup effect ---
function resolveStartupState(showStr, expiresStr, now = Date.now()) {
  const expiresAt = expiresStr ? parseInt(expiresStr, 10) : null
  if (showStr === 'true' && expiresAt && expiresAt > now) {
    return { showLocation: true, checkinExpiresAt: expiresAt, shouldClear: false }
  }
  if (showStr === 'true') {
    // Was active but expired while the app was closed
    return { showLocation: false, checkinExpiresAt: null, shouldClear: true }
  }
  return { showLocation: false, checkinExpiresAt: null, shouldClear: false }
}

// --- Logic replicated from toggleLocation (ON branch) ---
function createCheckin(now = Date.now()) {
  return { expiresAt: now + CHECKIN_DURATION_MS, showLocation: true }
}

// --- Logic replicated from CheckinGuard in _layout.tsx ---
function setupExpiryTimeout(token, checkinExpiresAt, onExpire, now = Date.now()) {
  if (!token || !checkinExpiresAt) return null
  const delay = checkinExpiresAt - now
  if (delay <= 0) {
    onExpire()
    return null
  }
  return setTimeout(onExpire, delay)
}

// ─── CHECKIN_DURATION_MS constant ────────────────────────────────────────────

describe('CHECKIN_DURATION_MS', () => {
  test('is exactly 2 hours in milliseconds', () => {
    expect(CHECKIN_DURATION_MS).toBe(7_200_000)
  })
})

// ─── Startup state resolution ─────────────────────────────────────────────────

describe('resolveStartupState — restoring check-in on app launch', () => {
  test('restores active check-in when expiry is in the future', () => {
    const futureExpiry = Date.now() + CHECKIN_DURATION_MS
    const result = resolveStartupState('true', String(futureExpiry))
    expect(result.showLocation).toBe(true)
    expect(result.checkinExpiresAt).toBe(futureExpiry)
    expect(result.shouldClear).toBe(false)
  })

  test('clears stale check-in when expiry has already passed', () => {
    const pastExpiry = Date.now() - 1000
    const result = resolveStartupState('true', String(pastExpiry))
    expect(result.showLocation).toBe(false)
    expect(result.checkinExpiresAt).toBeNull()
    expect(result.shouldClear).toBe(true) // signals AsyncStorage cleanup needed
  })

  test('returns no location when show flag was never set', () => {
    const result = resolveStartupState(null, null)
    expect(result.showLocation).toBe(false)
    expect(result.checkinExpiresAt).toBeNull()
    expect(result.shouldClear).toBe(false)
  })

  test('clears when show=true but no expiry is stored (legacy/corrupt data)', () => {
    const result = resolveStartupState('true', null)
    expect(result.showLocation).toBe(false)
    expect(result.shouldClear).toBe(true)
  })

  test('returns no location when show=false regardless of expiry value', () => {
    const futureExpiry = Date.now() + CHECKIN_DURATION_MS
    const result = resolveStartupState('false', String(futureExpiry))
    expect(result.showLocation).toBe(false)
  })
})

// ─── createCheckin ────────────────────────────────────────────────────────────

describe('createCheckin', () => {
  test('sets expiresAt to exactly now + 2 hours', () => {
    const now = Date.now()
    const { expiresAt } = createCheckin(now)
    expect(expiresAt).toBe(now + CHECKIN_DURATION_MS)
  })

  test('sets showLocation to true', () => {
    const { showLocation } = createCheckin()
    expect(showLocation).toBe(true)
  })

  test('two check-ins created 1 second apart have expiry times 1000 ms apart', () => {
    const t1 = 1_000_000_000
    const t2 = t1 + 1000
    expect(createCheckin(t2).expiresAt - createCheckin(t1).expiresAt).toBe(1000)
  })
})

// ─── CheckinGuard expiry timeout ─────────────────────────────────────────────

describe('setupExpiryTimeout (CheckinGuard logic)', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  test('calls onExpire immediately when check-in has already expired', () => {
    const onExpire = jest.fn()
    const pastExpiry = Date.now() - 1

    setupExpiryTimeout('valid-token', pastExpiry, onExpire)

    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  test('does not call onExpire before the delay elapses', () => {
    const onExpire = jest.fn()
    const futureExpiry = Date.now() + 5000

    setupExpiryTimeout('valid-token', futureExpiry, onExpire)

    jest.advanceTimersByTime(4999)
    expect(onExpire).not.toHaveBeenCalled()
  })

  test('calls onExpire exactly once when the timeout fires', () => {
    const onExpire = jest.fn()
    const futureExpiry = Date.now() + 5000

    setupExpiryTimeout('valid-token', futureExpiry, onExpire)

    jest.advanceTimersByTime(5000)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  test('returns null (no timer) when token is missing', () => {
    const onExpire = jest.fn()
    const result = setupExpiryTimeout(null, Date.now() + 5000, onExpire)
    expect(result).toBeNull()
    expect(onExpire).not.toHaveBeenCalled()
  })

  test('returns null (no timer) when checkinExpiresAt is null', () => {
    const onExpire = jest.fn()
    const result = setupExpiryTimeout('valid-token', null, onExpire)
    expect(result).toBeNull()
    expect(onExpire).not.toHaveBeenCalled()
  })

  test('returned timer ID can be cleared to cancel logout', () => {
    const onExpire = jest.fn()
    const id = setupExpiryTimeout('valid-token', Date.now() + 5000, onExpire)

    clearTimeout(id)
    jest.advanceTimersByTime(10000)

    expect(onExpire).not.toHaveBeenCalled()
  })
})
