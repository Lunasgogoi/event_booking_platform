const { redisClient } = require('../config/redis')
const env = require('../config/env')

async function getCache(key) {
  const value = await redisClient.get(key)
  return value ? JSON.parse(value) : null
}

async function setCache(key, value, ttlSeconds = env.CACHE_TTL_SECONDS) {
  await redisClient.set(key, JSON.stringify(value), {
    EX: ttlSeconds,
  })
}

async function deleteCache(key) {
  await redisClient.del(key)
}

module.exports = {
  getCache,
  setCache,
  deleteCache,
}
