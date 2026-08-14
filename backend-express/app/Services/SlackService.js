'use strict';

const crypto = require('crypto');
const slackConfig = require('../../config/slack');
const RedeemCodeRepository = require('../Repositories/RedeemCodeRepository');
const RedeemCodeType = require('../Constants/RedeemCode');
const logger = require('../Logging/logger');

const LOG_PREFIX = '[slack]';
const TYPE_LABELS = {
    genshin: 'Genshin Impact',
    honkai: 'Honkai Impact 3rd',
    zenless: 'Zenless Zone Zero',
};

class SlackService {
    constructor() {
        this.redeemCodeRepository = new RedeemCodeRepository();
    }

    /**
     * Verify Slack request signature (X-Slack-Signature).
     * @param {import('express').Request} req
     */
    verifySlackSignature(req) {
        const signingSecret = slackConfig.signingSecret;
        if (!signingSecret) {
            logger.warn(`${LOG_PREFIX} SLACK_SIGNING_SECRET missing — skipping signature check`);
            return true;
        }

        const timestamp = String(req.headers['x-slack-request-timestamp'] || '');
        const signature = String(req.headers['x-slack-signature'] || '');
        if (!timestamp || !signature) return false;

        const ts = Number(timestamp);
        if (!Number.isFinite(ts)) return false;
        if (Math.abs(Date.now() / 1000 - ts) > 60 * 5) return false;

        const rawBody =
            req.rawBody != null
                ? Buffer.isBuffer(req.rawBody)
                    ? req.rawBody.toString('utf8')
                    : String(req.rawBody)
                : '';

        if (!rawBody) {
            logger.warn(`${LOG_PREFIX} missing rawBody for signature verification`);
            return false;
        }

        const expected = `v0=${crypto
            .createHmac('sha256', signingSecret)
            .update(`v0:${timestamp}:${rawBody}`, 'utf8')
            .digest('hex')}`;

        try {
            const a = Buffer.from(expected, 'utf8');
            const b = Buffer.from(signature, 'utf8');
            if (a.length !== b.length) return false;
            return crypto.timingSafeEqual(a, b);
        } catch {
            return false;
        }
    }

    /**
     * Load active codes and format Slack text. Dùng cho slash command và webhook.
     * @returns {Promise<{ total: number, text: string }>}
     */
    async buildActiveCodesMessage() {
        const { result } = await this.redeemCodeRepository.listRedeemCodes({
            status: 'active',
            per_page: -1,
        });

        const byType = {};
        for (const type of RedeemCodeType.ALL) {
            byType[type] = [];
        }
        for (const item of result || []) {
            const type = String(item.type || '').toLowerCase();
            if (!byType[type]) byType[type] = [];
            byType[type].push({
                code: String(item.code || ''),
                rewards: Array.isArray(item.rewards) ? item.rewards.map(String) : [],
            });
        }

        const total = (result || []).length;
        const lines = [`*HoyoCodes — Active redeem codes* (${total})`, ''];
        for (const type of RedeemCodeType.ALL) {
            const items = byType[type] || [];
            lines.push(`*${TYPE_LABELS[type] || type}* (${items.length})`);
            if (!items.length) {
                lines.push('_None_');
            } else {
                for (const item of items) {
                    const rewards =
                        item.rewards.length > 0 ? ` — ${item.rewards.join(', ')}` : '';
                    lines.push(`• \`${item.code}\`${rewards}`);
                }
            }
            lines.push('');
        }

        return { total, text: lines.join('\n').trim() };
    }

    /**
     * Gửi code active (hoặc text tuỳ ý) lên Incoming Webhook.
     * @param {{ text?: string }} [opts]
     */
    async notifyActiveCodes(opts = {}) {
        const message = await this.buildActiveCodesMessage();
        const text =
            opts.text && String(opts.text).trim()
                ? String(opts.text).trim()
                : message.text;

        const url = slackConfig.webhookUrl;
        if (!url) {
            logger.warn(`${LOG_PREFIX} SLACK_WEBHOOK_URL not configured`);
            return { ok: false, total: message.total, text };
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
            signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            logger.error(`${LOG_PREFIX} webhook failed`, {
                status: res.status,
                detail: detail.slice(0, 300),
            });
            return { ok: false, total: message.total, text };
        }

        logger.info(`${LOG_PREFIX} webhook sent`);
        return { ok: true, total: message.total, text };
    }
}

module.exports = SlackService;
