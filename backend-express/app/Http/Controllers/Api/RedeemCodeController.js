/**
 * Admin user list — GET `/api/users`.
 */
const RedeemCodeRepository = require('../../../Repositories/RedeemCodeRepository');
const ResponseService = require('../../../Helpers/ResponseService');
const HTTP_STATUS = require('../../../Constants/HttpStatus');

class RedeemCodeController {
    constructor() {
        this.repository = new RedeemCodeRepository();
    }

    /**
     * @openapi
     * /redeem-codes:
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
    async show(req, res, next) {
        try {
          const { type } = req.validatedData; // từ middleware Zod
          const data = await this.repository.getCodesByType(type);
          return ResponseService.responseJson(res, HTTP_STATUS.SUCCESS, data);
        } catch (error) {
          return next(error);
        }
    }

    /**
     * @openapi
     * /redeem-codes/update-codes:
     *   get:
     *     tags: [RedeemCode]
     *     summary: Sync all redeem codes (genshin, honkai, zenless) into DB
     *     operationId: redeem_codes_update
     *     responses:
     *       "200":
     *         description: Success
     */
    async updateCodes(req, res, next) {
        try {
            const data = await this.repository.updateCodes();
            return ResponseService.responseJson(res, HTTP_STATUS.SUCCESS, data);
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @openapi
     * /redeem-codes/list:
     *   post:
     *     tags: [RedeemCode]
     *     summary: List redeem codes from DB
     *     operationId: redeem_codes_list
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               page: { type: integer }
     *               per_page: { type: integer }
     *               limit: { type: integer }
     *               type: { type: string, enum: [genshin, honkai, zenless] }
     *               status: { type: string, enum: [active, inactive] }
     *     responses:
     *       "200":
     *         description: Success — mỗi item có is_new (true nếu created_at trong 3 ngày)
     */
    async list(req, res, next) {
        try {
            const data = await this.repository.listRedeemCodes(req.validatedData);
            return ResponseService.responseJson(res, HTTP_STATUS.SUCCESS, data);
        } catch (error) {
            return next(error);
        }
    }
}

module.exports = RedeemCodeController;
