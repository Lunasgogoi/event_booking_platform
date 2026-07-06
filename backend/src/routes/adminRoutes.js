const express = require('express')
const { getDashboardStats, getUsers, updateUserRole, updateUserStatus } = require('../controllers/adminController')
const { protect } = require('../middlewares/authMiddleware')
const { restrictTo } = require('../middlewares/roleMiddleware')
const validateRequest = require('../middlewares/validateRequest')
const { updateUserRoleSchema, updateUserStatusSchema } = require('../validators/adminValidator')

const router = express.Router()

router.get('/dashboard', protect, restrictTo('admin'), getDashboardStats)
router.get('/users', protect, restrictTo('admin'), getUsers)
router.patch('/users/:userId/role', protect, restrictTo('admin'), validateRequest(updateUserRoleSchema), updateUserRole)
router.patch('/users/:userId/status', protect, restrictTo('admin'), validateRequest(updateUserStatusSchema), updateUserStatus)

module.exports = router
