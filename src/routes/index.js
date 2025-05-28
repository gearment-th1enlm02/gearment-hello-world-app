const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const authRoutes = require('./auth');
const userRoutes = require('./user');

router.use('/auth', authRoutes);
router.use(authenticateToken);
router.use('/user', userRoutes);

module.exports = router;