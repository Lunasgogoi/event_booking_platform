const app = require('./app')
const connectDB = require('./config/db')
const { connectRedis, disconnectRedis } = require('./config/redis')
const env = require('./config/env')

let server

async function startServer() {
  await connectDB()
  await connectRedis()

  server = app.listen(env.PORT, () => {
    console.log(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`)
  })
}

function shutdown(signal) {
  console.log(`${signal} received. Shutting down...`)

  if (!server) {
    process.exit(0)
  }

  server.close(async () => {
    await disconnectRedis()
    console.log('Server stopped')
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

startServer().catch((error) => {
  console.error('Failed to start server:', error.message)
  process.exit(1)
})
