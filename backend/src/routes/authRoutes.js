const express = require('express')
const { getMe, login, logout, register } = require('../controllers/authController')
const { protect } = require('../middlewares/authMiddleware')
const { authLimiter } = require('../middlewares/rateLimiter')
const validateRequest = require('../middlewares/validateRequest')
const { loginSchema, registerSchema } = require('../validators/authValidator')

const router = express.Router()

router.post('/register', authLimiter, validateRequest(registerSchema), register)
router.post('/login', authLimiter, validateRequest(loginSchema), login)
router.post('/logout', logout)
router.get('/me', protect, getMe)

module.exports = router
