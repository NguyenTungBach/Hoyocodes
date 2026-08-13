'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.createTable('redeem_codes', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'genshin|honkai|zenless',
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      rewards: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'active|inactive',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.dropTable('redeem_codes');
  }
};
