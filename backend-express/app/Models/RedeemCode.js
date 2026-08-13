'use strict';

const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
    class RedeemCode extends Model {
        static TYPE_GENSHIN = 'genshin';
        static TYPE_HONKAI = 'honkai';
        static TYPE_ZENLESS = 'zenless';
        static STATUS_ACTIVE = 'active';
        static STATUS_INACTIVE = 'inactive';
    }
    

    RedeemCode.init({
        id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        type: { type: DataTypes.STRING, allowNull: false },
        code: { type: DataTypes.STRING, allowNull: false, unique: true },
        rewards: {
            type: DataTypes.JSON,
            allowNull: true,
            get() {
                const raw = this.getDataValue('rewards');
                if (raw == null) return [];
                if (Array.isArray(raw)) return raw;
                if (typeof raw === 'string') {
                    try {
                        const parsed = JSON.parse(raw);
                        return Array.isArray(parsed) ? parsed : [];
                    } catch {
                        return [];
                    }
                }
                return [];
            },
            set(value) {
                if (value == null) {
                    this.setDataValue('rewards', null);
                    return;
                }
                if (typeof value === 'string') {
                    try {
                        const parsed = JSON.parse(value);
                        this.setDataValue('rewards', Array.isArray(parsed) ? parsed : []);
                    } catch {
                        this.setDataValue('rewards', []);
                    }
                    return;
                }
                this.setDataValue('rewards', Array.isArray(value) ? value : []);
            },
        },
        status: { type: DataTypes.STRING, allowNull: false },
    }, {
        sequelize,
        modelName: 'RedeemCode',
        tableName: 'redeem_codes',
        timestamps: true,
        underscored: true,
        paranoid: true,
        deletedAt: 'deleted_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    });

    RedeemCode.associate = () => {};

    return RedeemCode;
};
