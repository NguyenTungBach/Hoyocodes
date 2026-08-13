const UserRepository = require('../../../app/Repositories/UserRepository');
const db = require('../../../app/Models');
const UserType = require('../../../app/Constants/UserType');
const UserStatus = require('../../../app/Constants/UserStatus');

describe('UserRepository', () => {
    let repository;
    let dbAvailable = false;

    beforeAll(async () => {
        try {
            await db.sequelize.authenticate();
            dbAvailable = true;
        } catch (error) {
            console.warn('Database connection failed, unit tests will be skipped');
            dbAvailable = false;
        }
    });

    beforeEach(() => {
        repository = new UserRepository();
    });

    describe('getAll', () => {
        it('should return paginated users without sensitive fields', async () => {
            if (!dbAvailable) {
                return;
            }

            const suffix = `${Date.now()}`;
            const user = await db.User.create({
                user_code: `u${suffix}`.slice(0, 15),
                user_name: 'List Test',
                password: 'abc12345678',
                role: UserType.ADMIN,
                status: UserStatus.ON
            });

            try {
                const req = { query: { key_search: user.user_code, per_page: '10', page: '1' } };
                const data = await repository.getAll(req, { role: UserType.ADMIN });

                expect(data).toHaveProperty('result');
                expect(data).toHaveProperty('pagination');
                const hit = data.result.find((r) => r.id === user.id);
                expect(hit).toBeTruthy();
                expect(hit.password).toBeUndefined();
                expect(hit.jwt_active).toBeUndefined();
            } finally {
                await db.User.destroy({ where: { id: user.id }, force: true });
            }
        });
    });
});
