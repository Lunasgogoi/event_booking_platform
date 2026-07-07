const express = require('express')
const { changePassword, getMe, login, logout, register, requestOrganizerAccess, updateAvatar, updateMe } = require('../controllers/authController')
const { protect } = require('../middlewares/authMiddleware')
const { authLimiter } = require('../middlewares/rateLimiter')
const upload = require('../middlewares/uploadMiddleware')
const validateRequest = require('../middlewares/validateRequest')
const { changePasswordSchema, loginSchema, registerSchema, requestOrganizerAccessSchema, updateProfileSchema } = require('../validators/authValidator')

const router = express.Router()

router.post('/register', authLimiter, validateRequest(registerSchema), register)
router.post('/login', authLimiter, validateRequest(loginSchema), login)
router.post('/logout', logout)
router.get('/me', protect, getMe)
router.patch('/me', protect, validateRequest(updateProfileSchema), updateMe)
router.post('/organizer-request', protect, validateRequest(requestOrganizerAccessSchema), requestOrganizerAccess)
router.patch('/avatar', protect, upload.single('avatar'), updateAvatar)
router.patch('/password', protect, validateRequest(changePasswordSchema), changePassword)

module.exports = router
