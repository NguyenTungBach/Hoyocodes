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
     * @returns {boolean}
     */
    verifySlackSignature(req) {
        const signingSecret = slackConfig.signingSecret;
        if (!signingSecret) {
            // Dev / chưa cấu hình: cho phép (log cảnh báo).
            logger.warn(`${LOG_PREFIX} SLACK_SIGNING_SECRET missing — skipping signature check`);
            return true;
        }

        const timestamp = String(req.headers['x-slack-request-timestamp'] || '');
        const signature = String(req.headers['x-slack-signature'] || '');
        if (!timestamp || !signature) return false;

        const ts = Number(timestamp);
        if (!Number.isFinite(ts)) return false;
        // Reject replay older than 5 minutes
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

        const base = `v0:${timestamp}:${rawBody}`;
        const digest = crypto.createHmac('sha256', signingSecret).update(base, 'utf8').digest('hex');
        const expected = `v0=${digest}`;

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
     * @returns {Promise<{ total: number, byType: Record<string, Array<{ code: string, rewards: string[] }>>, siteUrl: string }>}
     */
    async getActiveCodesPayload() {
        const { result } = await this.redeemCodeRepository.listRedeemCodes({
            status: 'active',
            per_page: -1,
        });

        /** @type {Record<string, Array<{ code: string, rewards: string[] }>>} */
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
        return { total, byType, siteUrl: slackConfig.siteUrl };
    }

    /**
     * Plain-text summary for Slack messages.
     * @param {{ total: number, byType: Record<string, Array<{ code: string, rewards: string[] }>>, siteUrl: string }} payload
     */
    formatActiveCodesText(payload) {
        const lines = [`*HoyoCodes — Active redeem codes* (${payload.total})`, ''];

        for (const type of RedeemCodeType.ALL) {
            const items = payload.byType[type] || [];
            const label = TYPE_LABELS[type] || type;
            lines.push(`*${label}* (${items.length})`);
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

        lines.push(`👉 ${payload.siteUrl}`);
        return lines.join('\n').trim();
    }

    /**
     * Post JSON to Incoming Webhook.
     * @param {{ text?: string, blocks?: object[], response_type?: string }} body
     * @returns {Promise<boolean>}
     */
    async sendWebhook(body) {
        const url = slackConfig.webhookUrl;
        if (!url) {
            logger.warn(`${LOG_PREFIX} SLACK_WEBHOOK_URL not configured`);
            return false;
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            logger.error(`${LOG_PREFIX} webhook failed`, {
                status: res.status,
                detail: detail.slice(0, 300),
            });
            return false;
        }

        logger.info(`${LOG_PREFIX} webhook sent`);
        return true;
    }

    /**
     * Load active codes and push to Slack webhook.
     * @param {{ text?: string }} [opts] — optional custom text (skips DB format if set alone without notifyCodes)
     * @returns {Promise<{ ok: boolean, total: number, text: string }>}
     */
    async notifyActiveCodes(opts = {}) {
        const payload = await this.getActiveCodesPayload();
        const text =
            opts.text && String(opts.text).trim()
                ? String(opts.text).trim()
                : this.formatActiveCodesText(payload);

        const ok = await this.sendWebhook({ text });
        return { ok, total: payload.total, text };
    }
}

module.exports = SlackService;
