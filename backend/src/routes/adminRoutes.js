const express = require('express')
const { getDashboardStats } = require('../controllers/adminController')
const { protect } = require('../middlewares/authMiddleware')
const { restrictTo } = require('../middlewares/roleMiddleware')

const router = express.Router()

router.get('/dashboard', protect, restrictTo('admin'), getDashboardStats)

module.exports = router
