const express = require('express');
const router = express.Router();
const RedeemCodeController = require('../../app/Http/Controllers/Api/RedeemCodeController');
const {
  validateShowRedeemCode,
  validateListRedeemCode,
} = require('../../app/Http/Requests/RedeemCodeRequest');

const redeemCodeController = new RedeemCodeController();

/** GET /api/redeem-codes?type=genshin|honkai|zenless */
router.get('/', validateShowRedeemCode, redeemCodeController.show.bind(redeemCodeController));

/** GET /api/redeem-codes/update-codes — sync genshin + honkai + zenless */
router.get('/update-codes', redeemCodeController.updateCodes.bind(redeemCodeController));

/** POST /api/redeem-codes/list — list từ DB, filter type/status + paginate */
router.post('/list', validateListRedeemCode, redeemCodeController.list.bind(redeemCodeController));

module.exports = router;
