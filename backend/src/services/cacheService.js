const { redisClient } = require('../config/redis')
const env = require('../config/env')

async function getCache(key) {
  if (!redisClient.isOpen) return null

  const value = await redisClient.get(key)
  return value ? JSON.parse(value) : null
}

async function setCache(key, value, ttlSeconds = env.CACHE_TTL_SECONDS) {
  if (!redisClient.isOpen) return

  await redisClient.set(key, JSON.stringify(value), {
    EX: ttlSeconds,
  })
}

async function deleteCache(key) {
  if (!redisClient.isOpen) return

  await redisClient.del(key)
}

async function deleteCacheKeys(keys) {
  await Promise.all(keys.map((key) => redisClient.del(key)))
}

async function deleteCachePattern(pattern) {
  if (!redisClient.isOpen) return

  const keys = []

  for await (const keyOrKeys of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
    keys.push(...(Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys]))

    if (keys.length >= 100) {
      await deleteCacheKeys(keys.splice(0, keys.length))
    }
  }

  if (keys.length) {
    await deleteCacheKeys(keys)
  }
}

module.exports = {
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
}
