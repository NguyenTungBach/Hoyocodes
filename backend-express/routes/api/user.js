const express = require('express');
const router = express.Router();
const UserController = require('../../app/Http/Controllers/Api/UserController');
const {
  validateIndexUser,
} = require('../../app/Http/Requests/UserRequest');

const userController = new UserController();

/** GET /api/users — `routes/api/index.js`: authenticate + authorizeUserTypes(super_admin). */
router.get('/', validateIndexUser, userController.index.bind(userController));

module.exports = router;
