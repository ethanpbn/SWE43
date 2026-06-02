// Pure-logic unit tests for cafe filtering, search, and display.
// Functions are replicated verbatim from cafe-map.web.tsx so tests stay in sync with the source.

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function computeRating(cafeId) {
  return parseFloat((3.8 + (Number(cafeId) % 13) * 0.1).toFixed(1))
}

function applyFilters(cafes, {
  userPos = null,
  minRating = 0,
  maxDistanceKm = 0,
  sortBy = 'rating',
  searchQuery = '',
} = {}) {
  let result = cafes.map(c => ({
    ...c,
    distance: userPos
      ? haversineKm(userPos.lat, userPos.lon, c.lat, c.lon)
      : Infinity,
  }))

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase()
    result = result.filter(c => c.name.toLowerCase().includes(q))
  }

  if (minRating > 0) {
    result = result.filter(c => c.rating >= minRating)
  }

  if (maxDistanceKm > 0 && userPos) {
    result = result.filter(c => c.distance <= maxDistanceKm)
  }

  if (sortBy === 'distance' && userPos) {
    result.sort((a, b) => a.distance - b.distance)
  } else {
    result.sort((a, b) => b.rating - a.rating)
  }

  return result
}

const BASE_CAFES = [
  { id: '1001', name: 'Bean There', rating: computeRating(1001), lat: 33.68, lon: -117.83 },
  { id: '1002', name: 'Brew Co', rating: computeRating(1002), lat: 33.72, lon: -117.78 },
  { id: '1003', name: 'Espresso Bar', rating: computeRating(1003), lat: 33.74, lon: -117.76 },
  {
    id: '1004',
    name: 'The Extraordinarily Long Named Café That Goes On And On And On And On Without End',
    rating: computeRating(1004),
    lat: 33.69,
    lon: -117.82,
  },
]

// ─── Rating rounding ────────────────────────────────────────────────────────

describe('Cafe rating display rounding', () => {
  test('rating formula never produces more than one decimal place (no 3.666...)', () => {
    for (let id = 0; id < 100; id++) {
      const rating = computeRating(id)
      const asString = String(rating)
      const decimalPart = asString.includes('.') ? asString.split('.')[1] : ''
      expect(decimalPart.length).toBeLessThanOrEqual(1)
    }
  })

  test('rating stays within the range [3.8, 5.0] for all 13 cycle variants', () => {
    for (let id = 0; id < 13; id++) {
      const rating = computeRating(id)
      expect(rating).toBeGreaterThanOrEqual(3.8)
      expect(rating).toBeLessThanOrEqual(5.0)
    }
  })

  test('parseFloat(toFixed(1)) round-trips without accumulating floating-point error', () => {
    for (let id = 0; id < 100; id++) {
      const rating = computeRating(id)
      expect(rating).toBe(parseFloat(rating.toFixed(1)))
    }
  })
})

// ─── Cafe search ─────────────────────────────────────────────────────────────

describe('Cafe search', () => {
  test('search is case-insensitive', () => {
    const results = applyFilters(BASE_CAFES, { searchQuery: 'BEAN' })
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Bean There')
  })

  test('empty search string returns all cafes unchanged', () => {
    const results = applyFilters(BASE_CAFES, { searchQuery: '' })
    expect(results).toHaveLength(BASE_CAFES.length)
  })

  test('whitespace-only search string returns all cafes (trim guard)', () => {
    const results = applyFilters(BASE_CAFES, { searchQuery: '   ' })
    expect(results).toHaveLength(BASE_CAFES.length)
  })

  test('search for a non-existent name returns an empty array, not all results', () => {
    const results = applyFilters(BASE_CAFES, { searchQuery: 'zzznomatch' })
    expect(results).toHaveLength(0)
  })

  test('duplicate IDs in source data produce duplicate search results (no deduplication)', () => {
    // Documents the gap: the filter pipeline has no deduplication step.
    // If the Overpass API returns the same node twice, both markers appear.
    const withDuplicate = [...BASE_CAFES, BASE_CAFES[0]]
    const results = applyFilters(withDuplicate, { searchQuery: 'Bean There' })
    expect(results).toHaveLength(2) // both copies match — no dedup
  })

  test('long cafe name is preserved in full through the search pipeline', () => {
    const results = applyFilters(BASE_CAFES, { searchQuery: 'Extraordinarily Long' })
    expect(results).toHaveLength(1)
    expect(results[0].name.length).toBeGreaterThan(50)
  })

  test('partial name match works mid-string', () => {
    const results = applyFilters(BASE_CAFES, { searchQuery: 'resso' })
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Espresso Bar')
  })
})

// ─── Filter combinations ──────────────────────────────────────────────────────

describe('Filter combinations returning no results', () => {
  const userPos = { lat: 33.6846, lon: -117.8265 } // UCI area

  test('strict minRating + tiny maxDistanceKm returns empty array with no error', () => {
    // Gap: the UI shows an empty map with no feedback when this happens.
    const results = applyFilters(BASE_CAFES, {
      userPos,
      minRating: 5.0,
      maxDistanceKm: 0.1,
      sortBy: 'rating',
    })
    expect(results).toHaveLength(0)
    expect(Array.isArray(results)).toBe(true) // no throw, just empty
  })

  test('impossible search + minRating combo silently returns empty array', () => {
    const results = applyFilters(BASE_CAFES, {
      searchQuery: 'zzznomatch',
      minRating: 4.5,
    })
    expect(results).toHaveLength(0)
  })

  test('no filters applied returns all cafes sorted by rating descending', () => {
    const results = applyFilters(BASE_CAFES)
    expect(results).toHaveLength(BASE_CAFES.length)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].rating).toBeGreaterThanOrEqual(results[i].rating)
    }
  })

  test('distance sort without user position falls back to rating sort without throwing', () => {
    // sortBy=distance but no userPos — should not crash, should return all sorted by rating
    const results = applyFilters(BASE_CAFES, { sortBy: 'distance' })
    expect(results).toHaveLength(BASE_CAFES.length)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].rating).toBeGreaterThanOrEqual(results[i].rating)
    }
  })

  test('maxDistanceKm filter is silently ignored when no user position is known', () => {
    // Prevents the confusing case where enabling distance filter hides all cafes
    // before the user has granted geolocation permission.
    const results = applyFilters(BASE_CAFES, { maxDistanceKm: 0.1 }) // no userPos
    expect(results).toHaveLength(BASE_CAFES.length)
  })

  test('minRating 4.0 filters out cafes with rating below threshold', () => {
    const allAbove = applyFilters(BASE_CAFES, { minRating: 4.0 })
    expect(allAbove.every(c => c.rating >= 4.0)).toBe(true)
  })
})
