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
     * Load active codes từ cùng nguồn list API (`listRedeemCodes`) và format Slack text.
     * Dùng field `is_new` từ list (created_at trong NEW_CODE_DAYS ngày).
     * @returns {Promise<{ total: number, newTotal: number, text: string }>}
     */
    async buildActiveCodesMessage() {
        // Cùng logic với POST /api/redeem-codes/list
        const { result } = await this.redeemCodeRepository.listRedeemCodes({
            status: 'active',
            per_page: -1,
        });

        const byType = {};
        for (const type of RedeemCodeType.ALL) {
            byType[type] = [];
        }

        let newTotal = 0;
        for (const item of result || []) {
            const type = String(item.type || '').toLowerCase();
            if (!byType[type]) byType[type] = [];
            const isNew = Boolean(item.is_new);
            if (isNew) newTotal += 1;
            byType[type].push({
                code: String(item.code || ''),
                rewards: Array.isArray(item.rewards) ? item.rewards.map(String) : [],
                isNew,
            });
        }

        // Codes mới lên trước trong từng game
        for (const type of Object.keys(byType)) {
            byType[type].sort((a, b) => Number(b.isNew) - Number(a.isNew));
        }

        const total = (result || []).length;
        const lines = [
            `*HoyoCodes — Active redeem codes* (${total})`,
            `_NEW = created within last ${RedeemCodeType.NEW_CODE_DAYS} days_ (${newTotal} new)`,
            '',
        ];

        if (newTotal > 0) {
            lines.push(`*🆕 New codes* (${newTotal})`);
            for (const type of RedeemCodeType.ALL) {
                const news = (byType[type] || []).filter((i) => i.isNew);
                if (!news.length) continue;
                lines.push(`_${TYPE_LABELS[type] || type}_`);
                for (const item of news) {
                    const rewards =
                        item.rewards.length > 0 ? ` — ${item.rewards.join(', ')}` : '';
                    lines.push(`• \`NEW\` \`${item.code}\`${rewards}`);
                }
            }
            lines.push('');
        }

        lines.push('*All active codes*');
        lines.push('');
        for (const type of RedeemCodeType.ALL) {
            const items = byType[type] || [];
            lines.push(`*${TYPE_LABELS[type] || type}* (${items.length})`);
            if (!items.length) {
                lines.push('_None_');
            } else {
                for (const item of items) {
                    const badge = item.isNew ? '`NEW` ' : '';
                    const rewards =
                        item.rewards.length > 0 ? ` — ${item.rewards.join(', ')}` : '';
                    lines.push(`• ${badge}\`${item.code}\`${rewards}`);
                }
            }
            lines.push('');
        }

        return { total, newTotal, text: lines.join('\n').trim() };
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
            return { ok: false, total: message.total, newTotal: message.newTotal, text };
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
            return { ok: false, total: message.total, newTotal: message.newTotal, text };
        }

        logger.info(`${LOG_PREFIX} webhook sent`, {
            total: message.total,
            newTotal: message.newTotal,
        });
        return { ok: true, total: message.total, newTotal: message.newTotal, text };
    }
}

module.exports = SlackService;
