const assert = require('node:assert/strict')
const test = require('node:test')
const jwt = require('jsonwebtoken')
const ApiError = require('../src/utils/ApiError')
const generateToken = require('../src/utils/generateToken')
const env = require('../src/config/env')

test('ApiError carries status code and message', () => {
  const error = new ApiError(404, 'Not found')

  assert.equal(error.statusCode, 404)
  assert.equal(error.message, 'Not found')
  assert.equal(error.isOperational, true)
})

test('generateToken signs user id into JWT payload', () => {
  const token = generateToken('507f1f77bcf86cd799439011')
  const decoded = jwt.verify(token, env.JWT_SECRET)

  assert.equal(decoded.id, '507f1f77bcf86cd799439011')
})
