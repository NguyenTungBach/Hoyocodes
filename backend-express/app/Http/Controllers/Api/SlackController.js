'use strict';

const SlackService = require('../../../Services/SlackService');
const slackConfig = require('../../../../config/slack');
const ResponseService = require('../../../Helpers/ResponseService');
const HTTP_STATUS = require('../../../Constants/HttpStatus');
const logger = require('../../../Logging/logger');

class SlackController {
    constructor() {
        this.slackService = new SlackService();
    }

    /**
     * Slack Slash Command listener — POST /api/slack
     * Request URL: https://hoyocodes.onrender.com/api/slack
     *
     * Slack gửi application/x-www-form-urlencoded; response phải là Slack message JSON
     * (không bọc ResponseService) và trả trong ~3s.
     *
     * @openapi
     * /slack:
     *   post:
     *     tags: [Slack]
     *     summary: Slack slash command (/hoyocodes)
     *     operationId: slack_command
     *     responses:
     *       "200":
     *         description: Slack message payload
     */
    async command(req, res, next) {
        try {
            if (!this.slackService.verifySlackSignature(req)) {
                return res.status(401).send('invalid slack signature');
            }

            const command = String(req.body?.command || '').trim();
            logger.info('[slack] slash command', {
                command,
                user_id: req.body?.user_id,
                text: req.body?.text,
            });

            const { text } = await this.slackService.buildActiveCodesMessage();

            // in_channel = cả channel thấy; ephemeral = chỉ người gọi thấy
            const responseType =
                String(req.body?.text || '').trim().toLowerCase() === 'private'
                    ? 'ephemeral'
                    : 'in_channel';

            return res.status(200).json({
                response_type: responseType,
                text,
            });
        } catch (error) {
            logger.error('[slack] command failed', { message: error.message });
            // Vẫn 200 để Slack không báo "app did not respond" với lỗi generic
            return res.status(200).json({
                response_type: 'ephemeral',
                text: `HoyoCodes error: ${error.message || 'failed to load codes'}`,
            });
        }
    }

    /**
     * Push active codes (or custom text) to Slack Incoming Webhook.
     * POST /api/slack-send
     * Header: X-Notify-Secret: <SLACK_NOTIFY_SECRET> (bắt buộc nếu secret đã set)
     *
     * Body (optional):
     *   { "text": "custom message" } — gửi text tuỳ ý
     *   { } — lấy toàn bộ code status=active từ DB
     *
     * @openapi
     * /slack-send:
     *   post:
     *     tags: [Slack]
     *     summary: Send active redeem codes to Slack webhook
     *     operationId: slack_send
     *     parameters:
     *       - name: X-Notify-Secret
     *         in: header
     *         schema: { type: string }
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               text: { type: string }
     *     responses:
     *       "200":
     *         description: Success
     */
    async notify(req, res, next) {
        try {
            const configured = slackConfig.notifySecret;
            if (configured) {
                const provided = String(
                    req.headers['x-notify-secret'] || req.headers['x-slack-notify-secret'] || ''
                ).trim();
                if (!provided || provided !== configured) {
                    return ResponseService.responseJsonError(
                        res,
                        HTTP_STATUS.UNAUTHORIZED,
                        'Invalid notify secret'
                    );
                }
            }

            if (!slackConfig.isWebhookReady()) {
                return ResponseService.responseJsonError(
                    res,
                    HTTP_STATUS.SERVICE_UNAVAILABLE,
                    'SLACK_WEBHOOK_URL is not configured'
                );
            }

            const customText =
                req.body?.text != null && String(req.body.text).trim()
                    ? String(req.body.text).trim()
                    : null;

            const result = await this.slackService.notifyActiveCodes(
                customText ? { text: customText } : {}
            );

            if (!result.ok) {
                return ResponseService.responseJsonError(
                    res,
                    HTTP_STATUS.BAD_GATEWAY,
                    'Failed to send Slack webhook'
                );
            }

            return ResponseService.responseJson(res, HTTP_STATUS.SUCCESS, {
                sent: true,
                total: result.total,
                preview: result.text.slice(0, 500),
            });
        } catch (error) {
            return next(error);
        }
    }
}

module.exports = SlackController;
