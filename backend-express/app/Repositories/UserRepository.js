const db = require('../Models');
const { Op } = require('sequelize');

class UserRepository {
    constructor() {
        this.model = db.User;
    }

    async getAll(req, _user) {
        const page = Math.max(1, parseInt(String(req?.query?.page ?? req?.body?.page ?? 1), 10) || 1);
        const perPageRaw = req?.query?.per_page ?? req?.body?.per_page;
        const perPageNum =
            perPageRaw === undefined || perPageRaw === null || perPageRaw === ''
                ? 15
                : parseInt(String(perPageRaw), 10);

        const where = {};
        const keySearch = req?.query?.key_search || req?.body?.key_search;
        if (keySearch && String(keySearch).trim() !== '') {
            const t = String(keySearch).trim();
            where[Op.or] = [
                { user_code: { [Op.like]: `%${t}%` } },
                { user_name: { [Op.like]: `%${t}%` } }
            ];
        }

        const sortable = ['id', 'user_code', 'user_name', 'role', 'status', 'created_at', 'updated_at'];
        const field = req?.query?.field || req?.body?.field;
        const sortBy = (req?.query?.sort_by || req?.body?.sort_by || 'desc').toLowerCase();
        const col = field && sortable.includes(field) ? field : 'id';
        const dir = sortBy === 'asc' ? 'ASC' : 'DESC';
        const order = [[col, dir]];

        const baseQuery = {
            where,
            order,
            attributes: { exclude: ['password', 'remember_token', 'jwt_active'] }
        };

        const toPlain = (rows) => rows.map((r) => r.get({ plain: true }));

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
                    total_pages: 1
                }
            };
        }

        const limit = perPageNum > 0 ? perPageNum : 15;
        const offset = (page - 1) * limit;

        const { count, rows } = await this.model.findAndCountAll({
            ...baseQuery,
            limit,
            offset
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
                total_pages: totalPages
            }
        };
    }
}

module.exports = UserRepository;
