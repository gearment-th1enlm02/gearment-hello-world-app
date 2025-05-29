const express = require('express');
const router = express.Router();
const userDataController = require('../controllers/userDataController');

router.get('/:user_id',
    userDataController.getUserData
);
router.put('/:user_id',
    userDataController.updateUserData
);
router.delete("/:user_id",
    userDataController.deleteUserData
);
router.post('/upload-avatar',
    userDataController.uploadAvatar
);

module.exports = router;