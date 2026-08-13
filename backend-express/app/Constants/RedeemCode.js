// app/Constants/RedeemCodeType.js
module.exports = {
    GENSHIN: 'genshin',
    HONKAI: 'honkai',
    ZENLESS: 'zenless',
  
    ALL: Object.freeze(['genshin', 'honkai', 'zenless']),
  
    isValid(type) {
        return this.ALL.includes(String(type || '').toLowerCase());
    },
};