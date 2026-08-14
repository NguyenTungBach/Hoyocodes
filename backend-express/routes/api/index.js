'use strict';

/**
 * REST API skeleton — Auth + admin user list.
 */

const express = require('express');
const router = express.Router();

const authenticate = require('../../app/Http/Middleware/Authenticate');
const authorizeUserTypes = require('../../app/Http/Middleware/AuthorizeUserTypes');
const UserType = require('../../app/Constants/UserType');

const authRoutes = require('./auth');
const userRoutes = require('./user');
const redeemCodeRoutes = require('./redeem-codes');
const slackRoutes = require('./slack');

const AuthController = require('../../app/Http/Controllers/Api/AuthController');
const SlackController = require('../../app/Http/Controllers/Api/SlackController');

const authController = new AuthController();
const slackController = new SlackController();
const T = UserType;

// Redeem codes
router.use('/redeem-codes', redeemCodeRoutes);

// Slack slash command: POST /api/slack
router.use('/slack', slackRoutes);

// Gửi tin Slack (test): POST /api/slack-send
router.post('/slack-send', slackController.notify.bind(slackController));

// Auth
router.use('/auth', authRoutes);
router.use(authenticate()); // mọi route bên dưới mới bắt buộc login

router.get('/profile', authController.getProfile.bind(authController));

// Users
router.use('/users', authorizeUserTypes(T.ADMIN), userRoutes);

module.exports = router;
