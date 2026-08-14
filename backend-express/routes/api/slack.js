'use strict';

const express = require('express');
const router = express.Router();
const SlackController = require('../../app/Http/Controllers/Api/SlackController');

const slackController = new SlackController();

/** POST /api/slack — Slack Slash Command Request URL */
router.post('/', slackController.command.bind(slackController));

module.exports = router;
