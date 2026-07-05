const { createClient } = require('redis')
const env = require('./env')

const redisClient = createClient({
  url: env.REDIS_URL,
})

redisClient.on('error', (error) => {
  console.error('Redis error:', error.message)
})

redisClient.on('connect', () => {
  console.log('Redis connected')
})

async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect()
  }

  return redisClient
}

async function disconnectRedis() {
  if (redisClient.isOpen) {
    await redisClient.quit()
  }
}

module.exports = {
  redisClient,
  connectRedis,
  disconnectRedis,
}
