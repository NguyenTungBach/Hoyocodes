const createError = require('http-errors');
const db = require('../Models');
const RedeemCodeType = require('../Constants/RedeemCode');

class RedeemCodeRepository {
    constructor() {
        this.model = db.RedeemCode;
    }

    async getCodesByType(type) {
        const url = `https://api.ennead.cc/mihoyo/${type}/codes`;
        const res = await fetch(url, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
            throw createError(502, 'Failed to fetch redeem codes');
        }
        const payload = await res.json();
        return {
            type,
            active: payload.active ?? [],
            inactive: payload.inactive ?? [],
        };
    }

    /**
     * Upsert codes của 1 type vào redeem_codes.
     * Chưa có → create; đã có → update status/rewards/type.
     */
    async upsertCodesByType(type) {
        const data = await this.getCodesByType(type);
        const summary = { type, created: 0, updated: 0, total: 0 };

        const processItems = async (items, status) => {
            for (const item of items) {
                const code = String(item?.code ?? '').trim();
                if (!code) continue;

                const rewards = Array.isArray(item.rewards) ? item.rewards : [];
                const existing = await this.model.findOne({ where: { code } });

                if (existing) {
                    await existing.update({ type, rewards, status });
                    summary.updated += 1;
                } else {
                    await this.model.create({ type, code, rewards, status });
                    summary.created += 1;
                }
                summary.total += 1;
            }
        };

        await processItems(data.active, this.model.STATUS_ACTIVE ?? 'active');
        await processItems(data.inactive, this.model.STATUS_INACTIVE ?? 'inactive');

        return summary;
    }

    /**
     * Sync toàn bộ genshin + honkai + zenless.
     */
    async updateCodes() {
        const results = [];
        for (const type of RedeemCodeType.ALL) {
            results.push(await this.upsertCodesByType(type));
        }

        return {
            results,
            created: results.reduce((sum, r) => sum + r.created, 0),
            updated: results.reduce((sum, r) => sum + r.updated, 0),
            total: results.reduce((sum, r) => sum + r.total, 0),
        };
    }

    /**
     * List redeem_codes từ DB (đã sync).
     * Filters: type, status (không truyền = all).
     * Paginate: page + per_page|limit (giống UserRepository; per_page < 0 = lấy hết).
     */
    async listRedeemCodes(filters = {}) {
        const page = Math.max(1, parseInt(String(filters.page ?? 1), 10) || 1);
        const perPageRaw = filters.per_page ?? filters.limit;
        const perPageNum =
            perPageRaw === undefined || perPageRaw === null || perPageRaw === ''
                ? 15
                : parseInt(String(perPageRaw), 10);

        const where = {};
        const type = filters.type != null ? String(filters.type).trim() : '';
        const status = filters.status != null ? String(filters.status).trim() : '';
        if (type) where.type = type;
        if (status) where.status = status;

        const baseQuery = {
            where,
            order: [['id', 'DESC']],
        };

        const toPlain = (rows) =>
            rows.map((r) => {
                const item = r.get({ plain: true });
                if (Array.isArray(item.rewards)) {
                    // ok
                } else if (typeof item.rewards === 'string') {
                    try {
                        const parsed = JSON.parse(item.rewards);
                        item.rewards = Array.isArray(parsed) ? parsed : [];
                    } catch {
                        item.rewards = [];
                    }
                } else {
                    item.rewards = [];
                }
                item.is_new = RedeemCodeType.isNew(item.created_at);
                return item;
            });

        if (perPageNum < 0) {
            const rows = await this.model.findAll(baseQuery);
            const list = toPlain(rows);
            return {
                result: list,
                pagination: {
                    display: list.length,
                    total_records: list.length,
                    per_page: list.length || 0,
                    current_page: 1,
                    total_pages: 1,
                },
            };
        }

        const limit = perPageNum > 0 ? perPageNum : 15;
        const offset = (page - 1) * limit;

        const { count, rows } = await this.model.findAndCountAll({
            ...baseQuery,
            limit,
            offset,
        });
        const total = typeof count === 'number' ? count : 0;
        const list = toPlain(rows);
        const totalPages = total === 0 ? 1 : Math.max(1, Math.ceil(total / limit));

        return {
            result: list,
            pagination: {
                display: list.length,
                total_records: total,
                per_page: limit,
                current_page: page,
                total_pages: totalPages,
            },
        };
    }
}

module.exports = RedeemCodeRepository;
