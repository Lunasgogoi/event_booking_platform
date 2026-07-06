const assert = require('node:assert/strict')
const test = require('node:test')
const app = require('../src/app')
const User = require('../src/models/User')
const generateToken = require('../src/utils/generateToken')

const ADMIN_ID = '507f1f77bcf86cd799439011'
const USER_ID = '507f1f77bcf86cd799439012'

function startTestServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address()
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((closeResolve) => server.close(closeResolve)),
      })
    })
  })
}

async function request(method, path, options = {}) {
  const server = await startTestServer()

  try {
    const response = await fetch(`${server.baseUrl}${path}`, {
      method,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
    const json = await response.json()

    return {
      status: response.status,
      body: json,
    }
  } finally {
    await server.close()
  }
}

function stubUsers(t) {
  const originalFindById = User.findById

  User.findById = async (id) => {
    const value = String(id)

    if (value === ADMIN_ID) {
      return {
        _id: ADMIN_ID,
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        isActive: true,
      }
    }

    if (value === USER_ID) {
      return {
        _id: USER_ID,
        name: 'Regular User',
        email: 'user@example.com',
        role: 'user',
        isActive: true,
      }
    }

    return null
  }

  t.after(() => {
    User.findById = originalFindById
  })
}

function authHeader(userId) {
  return {
    Authorization: `Bearer ${generateToken(userId)}`,
  }
}

test('GET /health returns API status', async () => {
  const response = await request('GET', '/health')

  assert.equal(response.status, 200)
  assert.equal(response.body.success, true)
})

test('unknown route returns 404 response shape', async () => {
  const response = await request('GET', '/missing-route')

  assert.equal(response.status, 404)
  assert.equal(response.body.success, false)
  assert.match(response.body.message, /Route not found/)
})

test('protected routes require authentication', async () => {
  const response = await request('GET', '/api/admin/dashboard')

  assert.equal(response.status, 401)
  assert.equal(response.body.success, false)
  assert.equal(response.body.message, 'Authentication required')
})

test('Authorization bearer token takes precedence over stale cookie token', async (t) => {
  stubUsers(t)

  const response = await request('GET', '/api/auth/me', {
    headers: {
      ...authHeader(ADMIN_ID),
      Cookie: `token=${generateToken(USER_ID)}`,
    },
  })

  assert.equal(response.status, 200)
  assert.equal(response.body.user.role, 'admin')
})

test('regular users cannot access admin dashboard', async (t) => {
  stubUsers(t)

  const response = await request('GET', '/api/admin/dashboard', {
    headers: authHeader(USER_ID),
  })

  assert.equal(response.status, 403)
  assert.equal(response.body.success, false)
  assert.equal(response.body.message, 'You do not have permission to perform this action')
})

test('regular users cannot access admin user management', async (t) => {
  stubUsers(t)

  const response = await request('GET', '/api/admin/users', {
    headers: authHeader(USER_ID),
  })

  assert.equal(response.status, 403)
  assert.equal(response.body.success, false)
  assert.deepEqual(response.body.errors, [])
})

test('admin event creation validates payload before controller work', async (t) => {
  stubUsers(t)

  const response = await request('POST', '/api/events', {
    headers: authHeader(ADMIN_ID),
    body: {
      title: 'No',
    },
  })

  assert.equal(response.status, 400)
  assert.equal(response.body.success, false)
  assert.equal(response.body.message, 'Validation failed')
})

test('admin user role update validates payload before controller work', async (t) => {
  stubUsers(t)

  const response = await request('PATCH', `/api/admin/users/${USER_ID}/role`, {
    headers: authHeader(ADMIN_ID),
    body: {
      role: 'owner',
    },
  })

  assert.equal(response.status, 400)
  assert.equal(response.body.success, false)
  assert.equal(response.body.message, 'Validation failed')
})

test('booking creation validates selected seats before booking work', async (t) => {
  stubUsers(t)

  const response = await request('POST', '/api/bookings', {
    headers: authHeader(USER_ID),
    body: {
      eventId: '507f1f77bcf86cd799439013',
      seatNumbers: [],
    },
  })

  assert.equal(response.status, 400)
  assert.equal(response.body.success, false)
  assert.equal(response.body.message, 'Validation failed')
})
