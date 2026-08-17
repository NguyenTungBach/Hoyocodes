// app/Constants/RedeemCode.js
module.exports = {
    GENSHIN: 'genshin',
    HONKAI: 'honkai',
    ZENLESS: 'zenless',

    ALL: Object.freeze(['genshin', 'honkai', 'zenless']),

    /** Code coi là mới nếu created_at trong vòng N ngày gần nhất. */
    NEW_CODE_DAYS: 3,

    isValid(type) {
        return this.ALL.includes(String(type || '').toLowerCase());
    },

    /**
     * So sánh created_at với now:
     * is_new = true khi (now - created_at) <= NEW_CODE_DAYS ngày.
     * @param {string|Date|null|undefined} createdAt
     * @returns {boolean}
     */
    isNew(createdAt) {
        if (!createdAt) return false;
        const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
        if (Number.isNaN(created.getTime())) return false;

        const now = Date.now();
        const diffMs = now - created.getTime();
        if (diffMs < 0) return false;

        const diffDays = diffMs / (24 * 60 * 60 * 1000);
        return diffDays <= this.NEW_CODE_DAYS;
    },
};