const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const authRoutes = require('./auth');
const userRoutes = require('./user');
const userDataRoutes = require('./userData');

router.use('/auth', authRoutes);
router.use(authenticateToken);
router.use('/user', userRoutes);
router.use('/userdata', userDataRoutes);

module.exports = router;