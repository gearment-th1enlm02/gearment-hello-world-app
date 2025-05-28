const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get("/:user_id", userController.getUser);

module.exports = router;