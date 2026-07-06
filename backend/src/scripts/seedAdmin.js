const mongoose = require('mongoose')
const connectDB = require('../config/db')
const env = require('../config/env')
const User = require('../models/User')

async function seedAdmin() {
  if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required')
  }

  const email = env.SEED_ADMIN_EMAIL.trim().toLowerCase()
  const existingUser = await User.findOne({ email }).select('+password')

  if (existingUser) {
    existingUser.name = existingUser.name || env.SEED_ADMIN_NAME
    existingUser.role = 'admin'
    existingUser.isActive = true

    if (!existingUser.password) {
      existingUser.password = env.SEED_ADMIN_PASSWORD
    }

    await existingUser.save()
    console.log(`Admin user ensured: ${email}`)
    return
  }

  await User.create({
    name: env.SEED_ADMIN_NAME,
    email,
    password: env.SEED_ADMIN_PASSWORD,
    role: 'admin',
  })

  console.log(`Admin user created: ${email}`)
}

async function main() {
  try {
    await connectDB()
    await seedAdmin()
  } finally {
    await mongoose.disconnect()
  }
}

main().catch((error) => {
  console.error(`Failed to seed admin: ${error.message}`)
  process.exit(1)
})
