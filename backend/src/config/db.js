const mongoose = require('mongoose')
const env = require('./env')

async function connectDB() {
  mongoose.set('strictQuery', true)

  const connection = await mongoose.connect(env.MONGO_URI)
  console.log(`MongoDB connected: ${connection.connection.host}`)
  return connection
}

module.exports = connectDB
