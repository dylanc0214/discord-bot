/**
 * Sequelize instance — created once, shared across all models and connect.js
 * Import this directly to avoid circular dependencies.
 */
const { Sequelize, DataTypes, Op } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'discord_bot',
    process.env.DB_USER || 'discord_bot',
    process.env.DB_PASS || '',
    {
        host: process.env.DB_HOST || '172.21.0.2',
        port: parseInt(process.env.DB_PORT) || 3306,
        dialect: 'mysql',
        logging: false,
        pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
        dialectOptions: { 
            charset: 'utf8mb4',
            ssl: false
        },
        define: { timestamps: true, freezeTableName: false }
    }
);

/**
 * Add Mongoose-compatible static methods to a Sequelize model
 */
function addMongooseCompat(Model) {
    Model.find = async function(query = {}) {
        return this.findAll({ where: query });
    };

    const _origFindOne = Model.findOne.bind(Model);
    Model.findOne = async function(query = {}) {
        if (query && (query.where !== undefined || query.limit !== undefined || query.order !== undefined)) {
            return _origFindOne(query);
        }
        return _origFindOne({ where: query });
    };

    Model.deleteOne = async function(query = {}) {
        return this.destroy({ where: query, limit: 1 });
    };

    Model.deleteMany = async function(query = {}) {
        return this.destroy({ where: query });
    };

    Model.updateOne = async function(query = {}, update = {}) {
        const values = update.$set || update;
        return this.update(values, { where: query });
    };

    Model.countDocuments = async function(query = {}) {
        return this.count({ where: query });
    };

    return Model;
}

module.exports = { sequelize, DataTypes, Op, addMongooseCompat };
