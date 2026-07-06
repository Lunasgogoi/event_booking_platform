const express = require('express')
const { changePassword, getMe, login, logout, register, updateAvatar, updateMe } = require('../controllers/authController')
const { protect } = require('../middlewares/authMiddleware')
const { authLimiter } = require('../middlewares/rateLimiter')
const upload = require('../middlewares/uploadMiddleware')
const validateRequest = require('../middlewares/validateRequest')
const { changePasswordSchema, loginSchema, registerSchema, updateProfileSchema } = require('../validators/authValidator')

const router = express.Router()

router.post('/register', authLimiter, validateRequest(registerSchema), register)
router.post('/login', authLimiter, validateRequest(loginSchema), login)
router.post('/logout', logout)
router.get('/me', protect, getMe)
router.patch('/me', protect, validateRequest(updateProfileSchema), updateMe)
router.patch('/avatar', protect, upload.single('avatar'), updateAvatar)
router.patch('/password', protect, validateRequest(changePasswordSchema), changePassword)

module.exports = router
