/**
 * Admin user list — GET `/api/users`.
 */
const UserRepository = require('../../../Repositories/UserRepository');
const ResponseService = require('../../../Helpers/ResponseService');
const HTTP_STATUS = require('../../../Constants/HttpStatus');

class UserController {
    constructor() {
        this.repository = new UserRepository();
    }

    /**
     * @openapi
     * /users:
     *   get:
     *     tags: [User]
     *     summary: Admin list users
     *     operationId: users_index_admin
     *     description: JWT + super_admin. Query theo `UserRequest.validateIndexUser`.
     *     security:
     *       - auth: []
     *     parameters:
     *       - name: page
     *         in: query
     *         schema: { type: integer }
     *       - name: per_page
     *         in: query
     *         schema: { type: integer }
     *       - name: key_search
     *         in: query
     *         schema: { type: string }
     *     responses:
     *       "200":
     *         description: Success
     *       "401":
     *         description: Unauthorized
     *       "403":
     *         description: Forbidden
     */
    async index(req, res, next) {
        try {
            const data = await this.repository.getAll(req, req.user);
            return ResponseService.responseJson(res, HTTP_STATUS.SUCCESS, data);
        } catch (error) {
            return next(error);
        }
    }
}

module.exports = UserController;
