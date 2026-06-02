// Shared pg mock — handles both callback-style (startup queries) and promise-style (route handlers)
const mockQuery = jest.fn().mockImplementation((sql, paramsOrCb, cb) => {
  const callback =
    typeof paramsOrCb === 'function' ? paramsOrCb :
    typeof cb === 'function' ? cb : null
  if (callback) {
    callback(null, { rows: [], rowCount: 0 })
    return
  }
  return Promise.resolve({ rows: [], rowCount: 0 })
})

const Pool = jest.fn().mockImplementation(() => ({ query: mockQuery }))

module.exports = { Pool, mockQuery }
