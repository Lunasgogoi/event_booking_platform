const { createClient } = require('redis')
const env = require('./env')

const redisClient = createClient({
  url: env.REDIS_URL,
  socket: {
    connectTimeout: 5000,
    reconnectStrategy(retries, cause) {
      if (retries > 5) {
        return new Error(`Redis reconnect failed after ${retries} attempts`)
      }

      if (cause) {
        const message = cause.message || cause.code || cause.name || 'Unknown Redis connection error'
        console.error(`Redis reconnect attempt ${retries}: ${message}`)
      }

      return Math.min(retries * 200, 2000)
    },
  },
})

redisClient.on('error', (error) => {
  const message = error.message || error.code || error.name || 'Unknown Redis error'
  console.error('Redis error:', message)
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
