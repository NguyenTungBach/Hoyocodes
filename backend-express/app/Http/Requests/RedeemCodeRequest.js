'use strict';

const { z } = require('zod');
const ResponseService = require('../../Helpers/ResponseService');
const Translation = require('../../Helpers/Translation');
const { buildZodErrors } = require('./zodErrors');
const RedeemCodeType = require('../../Constants/RedeemCode');

const emptyToUndefined = (v) => (v === '' || v === null || v === undefined ? undefined : v);

const showRedeemCodeSchema = z.object({
    type: z.enum(RedeemCodeType.ALL, {
        required_error: 'type is required',
        invalid_type_error: 'type must be a string',
    }),
});

const listRedeemCodeSchema = z.object({
    page: z.preprocess(
        emptyToUndefined,
        z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).optional()
    ),
    per_page: z.preprocess(
        emptyToUndefined,
        z.union([z.number().int(), z.string().regex(/^-?\d+$/)]).optional()
    ),
    limit: z.preprocess(
        emptyToUndefined,
        z.union([z.number().int(), z.string().regex(/^-?\d+$/)]).optional()
    ),
    type: z.preprocess(
        emptyToUndefined,
        z.enum(RedeemCodeType.ALL).optional()
    ),
    status: z.preprocess(
        emptyToUndefined,
        z.enum(['active', 'inactive']).optional()
    ),
});

/** GET /api/redeem-codes?type=genshin|honkai|zenless */
const validateShowRedeemCode = async (req, res, next) => {
    try {
        const validatedData = showRedeemCodeSchema.parse({
            type: req.query.type,
        });
        req.validatedData = validatedData;
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            return ResponseService.responseJsonValidationError(
                res,
                buildZodErrors(error),
                Translation.trans('api.request.validation.validation_error')
            );
        }
        return next(error);
    }
};

/** POST /api/redeem-codes/list */
const validateListRedeemCode = async (req, res, next) => {
    try {
        const body = req.body || {};
        const validatedData = listRedeemCodeSchema.parse({
            page: body.page,
            per_page: body.per_page,
            limit: body.limit,
            type: body.type,
            status: body.status,
        });
        req.validatedData = validatedData;
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            return ResponseService.responseJsonValidationError(
                res,
                buildZodErrors(error),
                Translation.trans('api.request.validation.validation_error')
            );
        }
        return next(error);
    }
};

module.exports = {
    validateShowRedeemCode,
    validateListRedeemCode,
};
